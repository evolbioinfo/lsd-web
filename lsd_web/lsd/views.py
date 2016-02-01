from django.shortcuts import render

# Create your views here.
from django.http import HttpResponse


def index(request):
    context = {
        
    }
    return  render(request, 'lsd/new_run.html', context)

def  submit_run(request):
    context = {
        'inputtree':request.POST['inputtree']
    }
    return  render(request, 'lsd/submit_run.html', context)
    
