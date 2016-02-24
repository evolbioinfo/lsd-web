from django.shortcuts import render
from lsd.tasks import submitLSD

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
        'lsdrun': r,
        'jid'   : jid
    }
    return  render(request, 'lsd/submit_run.html', context)

def check_run(request):
    jid =  request.GET['jid'];
    LSDRun.objects.get(run_name=jid)
    context = {
        'lsdrun': r,
        'jid'   : jid
    }
    return  render(request, 'lsd/submit_run.html', context)
