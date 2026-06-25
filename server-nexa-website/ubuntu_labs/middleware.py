class SecurityHeadersMiddleware:
    """Adds security headers that Django's SecurityMiddleware doesn't cover.

    Django's SecurityMiddleware already handles HSTS, X-Content-Type-Options,
    X-Frame-Options, Cross-Origin-Opener-Policy, and Referrer-Policy via
    settings. This fills the remaining gaps from the OWASP HTTP Headers
    Cheat Sheet.
    """

    _API_CSP = "default-src 'none'; frame-ancestors 'none'"

    _UI_CSP = (
        "default-src 'self'; "
        "script-src 'self' 'unsafe-inline'; "
        "style-src 'self' 'unsafe-inline'; "
        "img-src 'self' data:; "
        "font-src 'self'; "
        "object-src 'none'; "
        "base-uri 'self'"
    )

    _PERMISSIONS_POLICY = "geolocation=(), camera=(), microphone=(), payment=(), usb=()"

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)
        path = request.path_info

        if path.startswith('/admin/') or path.startswith('/api/docs/') or path.startswith('/api/schema'):
            response['Content-Security-Policy'] = self._UI_CSP
        else:
            response['Content-Security-Policy'] = self._API_CSP

        response['Permissions-Policy'] = self._PERMISSIONS_POLICY
        response['Cross-Origin-Embedder-Policy'] = 'require-corp'
        response['Cross-Origin-Resource-Policy'] = 'same-site'
        # Explicitly disable the legacy XSS auditor — use CSP instead
        response['X-XSS-Protection'] = '0'
        return response
