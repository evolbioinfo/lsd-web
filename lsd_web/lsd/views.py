from django.shortcuts import render
from lsd.tasks import submitLSD
from lsd.models import LSDRun, RunTrees, RunTaxonDates, RunOutGroups

from lsd.controlers.LSDRunParser import LSDRunParser

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
            'times'  : times+1,
            'refresh': 2^times
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
        context = {
            'status': "Finished",
            'lsdrun': r,
            'trees' : r.resulttree_set.all(),
            'jid'   : jid
        }
        return  render(request, 'lsd/display_run.html', context)

    if(r.run_status == r.ERROR):
        context = {
            'error': r.err_message,
            'out'  : r.out_message,
            'jid'   : jid
        }
        return  render(request, 'lsd/error_run.html', context)
