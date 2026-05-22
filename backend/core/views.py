from django.http import HttpResponse


def healthcheck(_request):
	return HttpResponse("OK")


