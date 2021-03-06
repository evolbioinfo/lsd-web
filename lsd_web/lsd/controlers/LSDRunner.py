from lsd.models import LSDRun, RunTrees, RunTaxonDates, RunOutGroups
from subprocess import Popen, PIPE, STDOUT
import tempfile
import os
import re
import shutil

class LSDRunner:
    """A runner to launch LSD program"""
    lsdrun = None
    lsdpath = None
    def __init__(self,lsdrun,lsdpath):
        self.lsdrun = lsdrun
        self.lsdpath = lsdpath

    def run(self):
        options = []
        tempdir=tempfile.mkdtemp()
        dateFile = open(os.path.join(tempdir, "date.txt"), "w+t")
        treeFile = open(os.path.join(tempdir, "tree.txt"), "w+t")
        rateFile = open(os.path.join(tempdir, "rate.txt"), "w+t")
        groupsFile = open(os.path.join(tempdir, "groups.txt"), "w+t")
        # Taxon or node date file
        if len(self.lsdrun.runtaxondates_set.all())>0:
            self.dumpDates(dateFile)
            dateFile.close()
            options.append("-d")
            options.append(dateFile.name)
        else:
            if self.lsdrun.run_root_date != -1:
                options.append("-a")
                options.append(str(int(self.lsdrun.run_root_date)))
            if self.lsdrun.run_tips_date != -1:
                options.append("-z")
                options.append(str(int(self.lsdrun.run_tips_date)))
        # Confidence intervals
        if self.lsdrun.run_with_conf_int:
            nb_samples = self.lsdrun.run_nb_samples
            options.append("-f")
            options.append(str(nb_samples))
        # Outgroup definition: If this is set then we keep it
        # Because if we want to remove the outgroup, it must have
        # been done in the web interface
        if len(self.lsdrun.runoutgroups_set.all())>0:
            self.dumpGroups(groupsFile)
            groupsFile.close()
            options.append("-g")
            options.append(groupsFile.name)
            # We tell LSD keep the outgroup
            # Anyway otherwise it is lsd-web that will remove the outgroup
            options.append("-k")
        # Rooting method
        if self.lsdrun.run_rooting_method == "l":
            options.append("-r")
            options.append("l")
        if self.lsdrun.run_rooting_method == "a":
            options.append("-r")
            options.append("a")
        # With constraints
        if self.lsdrun.run_constraints:
            options.append("-c")
        # lower bound for the rate
        if self.lsdrun.run_rate_lower_bound != -1 :
            options.append("-t")
            options.append(str(self.lsdrun.run_rate_lower_bound))
        # Substitution Rates
        if self.dumpRates(rateFile):
            options.append("-w")
            options.append(rateFile.name)
        rateFile.close()
        # Run variance
        if self.lsdrun.run_variance:
            options.append("-v");
            options.append("1");
            if self.lsdrun.run_seq_length != -1:
                options.append("-s")
                options.append(str(self.lsdrun.run_seq_length))
            if self.lsdrun.run_param_variance != -1:
                options.append("-b")
                options.append(str(self.lsdrun.run_param_variance))
        # We prepare the run with input file
        self.dumpTrees(treeFile)
        treeFile.close()
        options.append("-i")
        options.append(treeFile.name)
        # We prepare the run with output dir
        outputFile=os.path.join(tempdir, "lsdout")
        options.append("-o")
        options.append(outputFile)

        # We launch the process
        print [self.lsdpath]+options
        proc = Popen([self.lsdpath]+options, stdout=PIPE, stderr=PIPE)
        out, err = proc.communicate()
        #streamdata = proc.communicate()[0]
        self.lsdrun.run_err_message=err
        self.lsdrun.run_out_message=out
        self.lsdrun.run_outpath=outputFile

        self.lsdrun.run_out_message=self.lsdrun.run_out_message[-2000:]
        self.lsdrun.run_err_message=self.lsdrun.run_err_message[-2000:]
        self.lsdrun.save()

        resDateFileName = outputFile+".date.newick"
        resNWFileName = outputFile+".newick"
        resNXFileName = outputFile+".nexus"
        
        if os.path.isfile(resDateFileName):
            resDateFile = open(resDateFileName,'r')
            resNWFile = open(resNWFileName,'r')
            resNXFile = open(resNXFileName,'r')
            resFile   = open(outputFile,'r')
            dates = resDateFile.readlines()
            nws = resNWFile.readlines()
            nxs = self.parseNexus(resNXFile)
            substinfos = self.parseRes(resFile)
            index = 0
            for treedate in dates:
                nw = nws[index]
                nx = nxs[index]
                substrate = substinfos[index][0]
                rootdate  = substinfos[index][1]
                self.lsdrun.resulttree_set.create(
                    result_subst_rate = float(substrate),
                    result_root_date  = float(rootdate),
                    result_newick     = nw,
                    result_date_newick= treedate,
                    result_nexus      = nx
                )
                index+=1
        self.lsdrun.save()
        shutil.rmtree(tempdir)
        return outputFile

    def dumpDates(self,outfile):
        outfile.write(str(len(self.lsdrun.runtaxondates_set.all()))+"\n")
        for date in self.lsdrun.runtaxondates_set.all():
            outfile.write(date.taxon_name+"\t"+str(date.taxon_date)+"\n")

    def dumpTrees(self,outfile):
        for tree in self.lsdrun.runtrees_set.all():
            outfile.write(tree.tree_newick+"\n")

    # Returns True if one rate is given for every tree
    # Returns False otherwise
    def dumpRates(self,outfile):
        rate = True
        for tree in self.lsdrun.runtrees_set.all():
            if tree.tree_subst_rate == -1:
                rate = False
            outfile.write(str(tree.tree_subst_rate)+"\n")
        return rate

    def dumpGroups(self,outfile):
        outfile.write(str(len(self.lsdrun.runoutgroups_set.all()))+"\n")
        for group in self.lsdrun.runoutgroups_set.all():
            outfile.write(group.taxon_name+"\n")

    def parseRes(self,resFile):
        substrate = []
        p = re.compile(".*rate (\d+(\.\d*){0,1}(e(-){0,1}\d+){0,1}).*?(?:\[.*?\].*?){0,1}, tMRCA (\d+(\.\d+){0,1})")
        for line in resFile:
            m = p.match(line)
            if m:
                sublistrate = [m.group(1),m.group(5)]
                substrate.append(sublistrate)
        return substrate

    def parseNexus(self,nexFile):
        trees = []
        p = re.compile("tree.*= (.*)")
        tree=""
        for line in nexFile:
            m = p.match(line)
            if m:
                trees.append(m.group(1))
        return trees
