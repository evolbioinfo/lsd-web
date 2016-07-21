from __future__ import absolute_import

from celery import shared_task
import time
import sys
import logging

from lsd.models import LSDRun, RunTrees, RunTaxonDates, RunOutGroups
from lsd.controlers.LSDRunner import LSDRunner
from celery.exceptions import SoftTimeLimitExceeded

@shared_task
def submitLSD(lsdrunid,lsdpath):
    try:
        lsdrun = LSDRun.objects.get(id=lsdrunid)
        lsdrun.run_name=submitLSD.request.id
        lsdrun.run_status=lsdrun.RUNNING
        lsdrun.save();

        runner=LSDRunner(lsdrun,lsdpath)
        out = runner.run()
        lsdrun.run_status=lsdrun.FINISHED
        
        lsdrun.save()
        #
        #runner = LSDRunner(lsdrun);
        #runner.run();
        return 'The submitLSD task (id=%s) executed with argument "%s" - %s - %s ' % (out,submitLSD.request.id,lsdrunid,lsdrun.run_date)
    except SoftTimeLimitExceeded  as e:
        lsdrun.run_status=lsdrun.ERROR
        lsdrun.run_err_message = "Job time limit exceeded."
        logging.exception("message")
        lsdrun.save()
        return ""
    except:
        lsdrun.run_status=lsdrun.ERROR
        lsdrun.run_err_message = sys.exc_info()[0]
        logging.exception("message")
        lsdrun.save()
        return ""

