from lsd.models import LSDRun, RunTrees, RunTaxonDates, RunOutGroups
from lsd.exceptions.RunParserException import RunParserException
from datetime import datetime
from django.utils import timezone
from django.db import transaction
import re
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
        tree=request.POST['inputtreestring'];

        if tree=="":
            raise RunParserException("Information is missing","Input tree file is missing")
        
        dates=""
        if 'inputdate' in request.FILES and request.POST['datesornot']=="yes":
            dates=LSDRunParser.parseFile(request.FILES['inputdate']);

        rate=request.POST.get('substrate','None')
        if rate != 'None' and rate != '' :
            substrate=float(rate)
        else:
            substrate=-1

        outgroup = request.POST.get("outgroupornot")=="yes"

        outgroups= request.POST['outgrouplist']
        # if 'outgroups' in request.FILES:
        #     outgroups=LSDRunParser.parseFile(request.FILES['outgroups']);
                    
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
            varianceparam=int(request.POST['varianceparam'])
                    
        if request.POST['lowboundrate'] == '':
            lowboundrate=-1
        else:
            lowboundrate=float(request.POST['lowboundrate'])
                
        if request.POST['seqlength'] == '':
            seqlength = -1
        else:
            seqlength = int(request.POST['seqlength'])

        if request.POST['nb_samples'] == '':
            nb_samples = 0
        else:
            nb_samples=int(request.POST['nb_samples'])

        r = LSDRun(
            run_date             = timezone.now(),
            run_root_date        = rootdate,
            run_tips_date        = tipsdate,
            run_constraints      = request.POST.get('constraints', False),
            run_with_conf_int    = request.POST.get('with_conf_int', False),
            run_nb_samples       = nb_samples,
            run_variance         = request.POST.get('variancesornot', False),
            run_seq_length       = seqlength,
            run_param_variance   = varianceparam,
            run_rooting_method   = "no" if outgroup else request.POST['estimateroot'],
            run_rate_lower_bound = lowboundrate)
        r.save()

        with transaction.atomic():
            r.runtrees_set.create(
                tree_newick     = tree,
                tree_index      = 0,
                tree_subst_rate = substrate
            )

        with transaction.atomic():
            try:
                index = 0
                num = 0
                for line in dates.splitlines():
                    if index == 0 :
                        num = int(line)
                    else:
                        date = re.split('\s',line)
                        r.runtaxondates_set.create(
                            taxon_name = date[0],
                            taxon_date = date[1])
                    index+=1
            except :
                raise RunParserException("Parsing error","Cannot parse date file")

                
        with transaction.atomic():
            for taxon in outgroups.splitlines():
                r.runoutgroups_set.create(taxon_name=taxon)
        r.save()
        return(r)
