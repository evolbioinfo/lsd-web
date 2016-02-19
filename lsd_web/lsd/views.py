from django.shortcuts import render
from lsd.tasks import test

# Create your views here.
from django.http import HttpResponse

def index(request):
    context = {
        
    }
    return  render(request, 'lsd/new_run.html', context)

def  submit_run(request):
    jid=test.delay('123')
    context = {
        'inputtree':request.POST['inputtree'],
        'jid': jid
    }
    return  render(request, 'lsd/submit_run.html', context)
