from django.conf.urls import url

from . import views
app_name = 'lsd'
urlpatterns = [
    url(r'^$', views.index, name='index'),
    url(r'^submit_run$', views.submit_run, name='submit_run'),
    url(r'^check_run$', views.check_run, name='check_run'),
    url(r'^create_account$', views.create_account, name='create_account')
]
