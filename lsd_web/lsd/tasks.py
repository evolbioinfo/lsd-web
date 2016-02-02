from __future__ import absolute_import

from celery import shared_task
import time

@shared_task
def test(param):
    time.sleep(30)
    return 'The test task (id=%s) executed with argument "%s" ' % (test.request.id,param)
