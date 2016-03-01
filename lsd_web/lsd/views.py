from django.shortcuts import render
from lsd.tasks import submitLSD
from lsd.models import LSDRun, RunTrees, RunTaxonDates, RunOutGroups
from django.contrib.auth import views
import base64

from lsd.controlers.LSDRunParser import LSDRunParser
from lsd.controlers.TreeRenderer import TreeRenderer

# Create your views here.
from django.http import HttpResponse

def index(request):
    context = {
        
    }
    return  render(request, 'lsd/new_run.html', context)

def submit_run(request):
    r = LSDRunParser.parse(request)
    r.save()
    jid=submitLSD.delay(r.id)

    context = {
        'status' : "Pending",
        'jid'    : jid,
        'times'  : 1,
        'refresh': 2,
    }
    return  render(request, 'lsd/wait_run.html', context)

def check_run(request):
    jid   = request.GET['jid'];
    times = 1;
    if 'times' in request.GET:
        times = request.GET['times'];
        
    r = LSDRun.objects.get(run_name=jid)

    if r.run_status == r.RUNNING:
        context = {
            'status' : "Running",
            'jid'    : jid,
            'times'  : str(times+1),
            'refresh': str(2^times)
        }
        return  render(request, 'lsd/wait_run.html', context)

    if r.run_status == r.PENDING :
        context = {
            'status' : "Pending",
            'jid'    : jid,
            'times'  : times+1,
            'refresh': 2^times
        }
        return  render(request, 'lsd/wait_run.html', context)        

    if(r.run_status == r.FINISHED):
        treeData = []
        treeDateData = []

        if 'pdf' in request.GET and (int)(request.GET['pdf'])<len( r.resulttree_set.all()):
            t = r.resulttree_set.all()[(int)(request.GET['pdf'])]
            imagehex64_2=TreeRenderer.renderNexus(t.result_nexus, 1200,True)
            res = HttpResponse(imagehex64_2)
            res['Content-Type'] = 'application/pdf'
            res['Content-Disposition'] = 'attachment; filename=tree.pdf'
            return res

        for t in r.resulttree_set.all():
            imagehex64=TreeRenderer.renderNewick(t.result_newick,400,False)
            imagehex64_2=TreeRenderer.renderNexus(t.result_nexus, 1200,False)
            #treeData.append(imagehex64)
            treeDateData.append(imagehex64_2)

        context = {
            'status'     : "Finished",
            'lsdrun'     : r,
            'trees'      : r.resulttree_set.all(),
            'treeimages' : treeData,
            'treedateimages' : treeDateData,
            'output'     : r.run_out_message,
            'error'      : r.run_err_message,
            'jid'        : jid
        }
        return  render(request, 'lsd/display_run.html', context)

    if(r.run_status == r.ERROR):
        context = {
            'error': r.run_err_message,
            'out'  : r.run_out_message,
            'jid'   : jid
        }
        return  render(request, 'lsd/error_run.html', context)
