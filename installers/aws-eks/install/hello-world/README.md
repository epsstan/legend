# Overview

This is a simple Hello World HTTP service that is used to test the EKS cluster and related plumbing.

k8s deployment and service definitions are straightforward.

For the k8s ingress, we use an annotation to rewrite the URLs. e.g /foo is redirected to / on the service.

