from __future__ import absolute_import

from celery import shared_task

@shared_task
def test(param):
    return 'The test task (id=%s) executed with argument "%s" ' % (test.request.id,param)

