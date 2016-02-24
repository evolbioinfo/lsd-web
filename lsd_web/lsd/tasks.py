from __future__ import absolute_import

from celery import shared_task
import time

from lsd.models import LSDRun, RunTrees, RunTaxonDates, RunOutGroups
from lsd.controlers.LSDRunner import LSDRunner

@shared_task
def submitLSD(lsdrunid):
    lsdrun = LSDRun.objects.get(id=lsdrunid)
    lsdrun.run_name=submitLSD.request.id
    lsdrun.run_status=lsdrun.RUNNING
    lsdrun.save();

    runner=LSDRunner(lsdrun)
    out = runner.run()
    lsdrun.run_status=lsdrun.FINISHED
 
    lsdrun.save()
    #
    #runner = LSDRunner(lsdrun);
    #runner.run();
    return 'The submitLSD task (id=%s) executed with argument "%s" - %s - %s ' % (out,submitLSD.request.id,lsdrunid,lsdrun.run_date)
