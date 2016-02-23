from __future__ import absolute_import

from celery import shared_task
import time

from lsd.models import LSDRun, RunTrees, RunTaxonDates, RunOutGroups
from lsd import LSDRunner

@shared_task
def submitLSD(lsdrunid):
    lsdrun = LSDRun.objects.get(id=lsdrunid)
    lsdrun.run_name=submitLSD.request.id
    lsdrun.save();

    runner=LSDRunner.LSDRunner(lsdrun)
    out = runner.run()

    #
    #runner = LSDRunner(lsdrun);
    #runner.run();
    return 'The submitLSD task (id=%s) executed with argument "%s" - %s - %s ' % (out,submitLSD.request.id,lsdrunid,lsdrun.run_date)
