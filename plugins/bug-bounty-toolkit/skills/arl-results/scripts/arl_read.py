#!/usr/bin/env python3
"""Read ARL results; optionally remember login in Windows Credential Manager."""

import argparse
import getpass
import json
import ssl
import sys
import urllib.error
import urllib.parse
import urllib.request

import arl_credentials


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, request, fp, code, msg, headers, newurl):
        return None


def api_base(raw):
    parsed = urllib.parse.urlsplit(raw)
    if (parsed.scheme != "https" or not parsed.hostname or parsed.username
            or parsed.password or parsed.path not in ("", "/")
            or parsed.query or parsed.fragment):
        raise ValueError("base URL must be an HTTPS origin, such as https://192.168.1.128:5003")
    return raw.rstrip("/") + "/api"


def opener(server_cert):
    context = ssl.create_default_context(cafile=server_cert)
    # The ARL certificate may lack an IP subjectAltName. Supplying the PEM
    # limits trust to that certificate, even when hostname checking is off.
    if server_cert:
        context.check_hostname = False
    return urllib.request.build_opener(
        urllib.request.HTTPSHandler(context=context), NoRedirect()
    )


def request_json(client, url, token=None, payload=None):
    headers = {"Accept": "application/json"}
    if token:
        headers["Token"] = token
    data = None
    if payload is not None:
        data = json.dumps(payload).encode("utf-8")
        headers["Content-Type"] = "application/json"
    request = urllib.request.Request(url, data=data, headers=headers)
    with client.open(request, timeout=15) as response:
        if response.headers.get_content_type() != "application/json":
            raise ValueError("ARL returned a non-JSON response")
        result = json.load(response)
    if not isinstance(result, dict):
        raise ValueError("ARL returned an unexpected response")
    code = result.get("code")
    if code is not None and str(code) not in ("0", "200"):
        raise ValueError("ARL rejected the request (API code " + str(code) + ")")
    return result


def login(client, base, username, password):
    if not username or not password:
        raise ValueError("username and password are required")
    result = request_json(
        client, base + "/user/login", payload={"username": username, "password": password}
    )
    data = result.get("data")
    token = data.get("token") if isinstance(data, dict) else None
    if not isinstance(token, str) or not token:
        raise ValueError("login did not return a session token")
    return token


def authenticate(client, base, origin, no_remember):
    saved = None if no_remember else arl_credentials.read(origin)
    if saved is not None:
        try:
            return login(client, base, *saved)
        except ValueError as exc:
            if "API code 401" in str(exc):
                raise ValueError("saved ARL login was rejected; run 'forget' and try again") from None
            raise
    username = input("ARL 用户名: ").strip()
    password = getpass.getpass("ARL 密码（输入时不显示）: ")
    token = login(client, base, username, password)
    if not no_remember:
        arl_credentials.write(origin, username, password)
        print("ARL login saved in Windows Credential Manager", file=sys.stderr)
    return token


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--base-url", required=True, help="ARL HTTPS origin")
    parser.add_argument("--server-cert", help="PEM file of the ARL server certificate")
    parser.add_argument("--no-remember", action="store_true", help="prompt without using or saving Windows credentials")
    commands = parser.add_subparsers(dest="command", required=True)
    commands.add_parser("health", help="check API availability without logging in")
    commands.add_parser("status", help="check whether login is remembered without showing it")
    commands.add_parser("forget", help="remove the remembered login for this ARL origin")
    commands.add_parser("doctor", help="log in and verify task access")
    commands.add_parser("tasks", help="read one page of ARL tasks")
    assets = commands.add_parser("assets", help="read one page of task assets")
    assets.add_argument("--kind", choices=("domain", "site", "ip"), required=True)
    assets.add_argument("--task-id", required=True)
    for name in ("tasks", "assets"):
        item = commands.choices[name]
        item.add_argument("--page", type=int, default=1)
        item.add_argument("--size", type=int, default=20)
    args = parser.parse_args()
    if getattr(args, "page", 1) < 1 or not 1 <= getattr(args, "size", 1) <= 100:
        parser.error("page must be positive and size must be between 1 and 100")
    try:
        base = api_base(args.base_url)
        origin = base[:-4]
        if args.command == "status":
            print("ARL login saved" if arl_credentials.read(origin) else "No ARL login saved")
            return 0
        if args.command == "forget":
            print("ARL login removed" if arl_credentials.delete(origin) else "No ARL login was saved")
            return 0
        client = opener(args.server_cert)
        if args.command == "health":
            result = request_json(client, base + "/swagger.json")
            if result.get("swagger") != "2.0":
                raise ValueError("unexpected ARL API description")
            print("ARL API reachable; authentication not checked")
            return 0
        token = authenticate(client, base, origin, args.no_remember)
        endpoint = "/task/" if args.command in ("doctor", "tasks") else "/" + args.kind + "/"
        query = {"page": 1, "size": 1} if args.command == "doctor" else {
            "page": args.page, "size": args.size
        }
        if args.command == "assets":
            query["task_id"] = args.task_id
        url = base + endpoint + "?" + urllib.parse.urlencode(query)
        result = request_json(client, url, token=token)
        if args.command == "doctor":
            print("ARL login and task read succeeded")
        else:
            print(json.dumps(result, ensure_ascii=False, indent=2))
        return 0
    except (ValueError, urllib.error.URLError, ssl.SSLError, OSError) as exc:
        # Never print request or response bodies, which might contain secrets.
        message = str(exc) if isinstance(exc, ValueError) else type(exc).__name__
        print("ARL connection failed: " + message, file=sys.stderr)
        return 1


if __name__ == "__main__":
    sys.exit(main())
