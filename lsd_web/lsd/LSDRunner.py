from lsd.models import LSDRun, RunTrees, RunTaxonDates, RunOutGroups
from subprocess import call
import tempfile
import os

class LSDRunner:
    """A runner to launch LSD program"""
    lsdrun = None
    lsdpath="/home/flemoine/Documents/lsd_interface/lsd/lsd-0.2/bin/lsd.exe"
    
    def __init__(self,lsdrun):
        self.lsdrun = lsdrun

    def run(self):
        print "Launching "+self.lsdrun.run_name
        options = []
        tempdir=tempfile.mkdtemp()
        dateFile = open(os.path.join(tempdir, "date.txt"), "w+t")
        treeFile = open(os.path.join(tempdir, "tree.txt"), "w+t")
        groupsFile = open(os.path.join(tempdir, "groups.txt"), "w+t")
        if len(self.lsdrun.runtaxondates_set.all())>0:
            self.dumpDates(dateFile)
            dateFile.close()
            options.append("-d")
            options.append(dateFile.name)
        else:
            if self.lsdrun.run_root_date != -1:
                options.append("-a")
                options.append(str(self.lsdrun.run_root_date))
            if self.lsdrun.run_tips_date != -1:
                options.append("-z")
                options.append(str(self.lsdrun.run_tips_date))
        if len(self.lsdrun.runoutgroups_set.all())>0:
            self.dumpGroups(groupsFile)
            groupsFile.close()
            options.append("-g")
            options.append(groupsFile.name)
        if self.lsdrun.run_rooting_method == "l":
            options.append("-r")
            options.append("l")
        if self.lsdrun.run_rooting_method == "a":
            options.append("-r")
            options.append("a")
        if self.lsdrun.run_constraints:
            options.append("-c")

        if self.lsdrun.run_rate_lower_bound:
            options.append("-t")
            options.append(str(self.lsdrun.run_rate_lower_bound))

        if self.lsdrun.run_variance:
            options.append("-v");
            if self.lsdrun.run_seq_length != -1:
                options.append("-s")
                options.append(str(self.lsdrun.run_seq_length))
            if self.lsdrun.run_param_variance != -1:
                options.append("-b")
                options.append(str(self.lsdrun.run_param_variance))
        self.dumpTrees(treeFile)
        treeFile.close()
        options.append("-i")
        options.append(treeFile.name)
        outputFile=os.path.join(tempdir, "lsdout")
        options.append("-o")
        options.append(outputFile)
        call([self.lsdpath]+options)
        print [self.lsdpath]+options
        #tempdir.close()
        return outputFile

    def dumpDates(self,outfile):
        outfile.write(str(len(self.lsdrun.runtaxondates_set.all()))+"\n")
        for date in self.lsdrun.runtaxondates_set.all():
            outfile.write(date.taxon_name+"\t"+str(date.taxon_date)+"\n")

    def dumpTrees(self,outfile):
        for tree in self.lsdrun.runtrees_set.all():
            outfile.write(tree.tree_newick+"\n")

    def dumpGroups(self,outfile):
        outfile.write(str(len(self.lsdrun.runoutgroups_set.all()))+"\n")
        for group in self.lsdrun.runoutgroups_set.all():
            outfile.write(group.taxon_name+"\n")
