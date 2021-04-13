resource "aws_route53_zone" "legendtest" {
  name = "legendtest.com"

  tags = local.standard_tags
}

resource "aws_route53_record" "integration" {
  zone_id = aws_route53_zone.legendtest.zone_id
  name    = "integration.legendtest.com"
  type    = "A"
  ttl     = "300"
  records = [aws_eip.eip.public_ip]
}


