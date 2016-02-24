from lsd.models import LSDRun, RunTrees, RunTaxonDates, RunOutGroups
from datetime import datetime
from django.utils import timezone
from django.db import transaction
import tempfile

class LSDRunParser:
    """A parser of request that returns a LSDRun saved in DB"""

    @staticmethod
    def parseFile(f):
        tree="";
        for chunk in f.chunks():
            tree=tree+chunk
        return(tree);

    @staticmethod
    def parse(request):
        tree=LSDRunParser.parseFile(request.FILES['inputtree']);
        dates=""
        if 'inputdate' in request.FILES and request.POST['datesornot']=="yes":
            dates=LSDRunParser.parseFile(request.FILES['inputdate']);

        rates=""
        if 'substrates' in request.FILES:
            rates=LSDRunParser.parseFile(request.FILES['substrates']);
            
        outgroups=""
        if 'outgroups' in request.FILES:
            outgroups=LSDRunParser.parseFile(request.FILES['outgroups']);
                    
        if request.POST['rootdate'] == '':
            rootdate=-1
        else:
            rootdate=float(request.POST['rootdate'])
            
        if request.POST['tipsdate'] == '':
            tipsdate=-1
        else:
            tipsdate=float(request.POST['tipsdate'])
                        
        if request.POST['varianceparam'] == '':
            varianceparam=-1
        else:
            varianceparam=float(request.POST['varianceparam'])
                    
        if request.POST['lowboundrate'] == '':
            lowboundrate=-1
        else:
            lowboundrate=float(request.POST['lowboundrate'])
                
        if request.POST['seqlength'] == '':
            seqlength = -1
        else:
            seqlength = request.POST['seqlength']
                    
        r = LSDRun(
            run_date             = timezone.now(),
            run_root_date        = rootdate,
            run_tips_date        = tipsdate,
            run_constraints      = request.POST.get('constraints', False),
            run_variance         = request.POST.get('variancesornot', False),
            run_seq_length       = seqlength,
            run_param_variance   = varianceparam,
            run_rooting_method   = request.POST['estimateroot'],
            run_rate_lower_bound = lowboundrate)
        r.save()
                                        
        substrates=rates.splitlines()
                                      
        with transaction.atomic():
            index=0
            for tree in tree.splitlines():
                substrate = -1
                if(len(substrates)>index):
                    substrate = substrate[index]
                r.runtrees_set.create(
                    tree_newick     = tree,
                    tree_index      = index,
                    tree_subst_rate = float(substrate)
                )
                index+=1

        with transaction.atomic():
            index = 0
            num = 0
            for line in dates.splitlines():
                if index == 0 :
                    num = int(line)
                else:
                    date = line.split('\t')
                    r.runtaxondates_set.create(
                        taxon_name = date[0],
                        taxon_date = float(date[1])
                    )
                index+=1

        with transaction.atomic():
            index = 0
            for taxon in outgroups.splitlines():
                if index == 0 :
                    num = int(taxon)
                else:
                    r.runoutgroups_set.create(taxon_name=taxon)
                index+=1
        r.save()
        return(r)
