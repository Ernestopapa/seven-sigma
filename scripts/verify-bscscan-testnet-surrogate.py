#!/usr/bin/env python3
"""Verify SevenSigma on BscScan TESTNET (chain 97) via Etherscan v2 API,
using the registered custom.bscscan API key through the authd surrogate.
No key or surrogate value is ever printed, logged, or written to a file.
Only guid / status / result strings are saved."""
import json
import sys
import time
import urllib.parse
import urllib.request

sys.path.insert(0, "/opt/muse/skills/custom-connector-setup/bin")
from dynamic_credentials import (
    DynamicCredentialError,
    read_json_response,
    url_with_surrogate_query_param,
)

CONNECTOR = "custom.bscscan"
HOSTS = ["api.etherscan.io"]
ADDRESS = "0x5332713cBC477893e5CFDd8087B8B78a5e6AaFFe"
MOCK_REGISTRY = "0x910B24d382c21f453494161C03eb97594A635d76"
DEPLOYER = "0xd943bdD7236E000BF914531Bc235b60200f0d65D"
# ABI-encoded constructor args (address agentIdRegistry_, address initialOwner)
CONSTRUCTOR_ARGS = (
    "000000000000000000000000910b24d382c21f453494161c03eb97594a635d76"
    "000000000000000000000000d943bdd7236e000bf914531bc235b60200f0d65d"
)
RESULT_FILE = "/home/hatch/workspace/seven-sigma/verification/bscscan-result.json"


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, *args):
        raise RuntimeError("redirect refused")


def get(params):
    query = urllib.parse.urlencode({"chainid": "97", **params})
    url = f"https://api.etherscan.io/v2/api?{query}"
    try:
        authed = url_with_surrogate_query_param(url, CONNECTOR, allowed_hosts=HOSTS)
    except DynamicCredentialError as exc:
        raise SystemExit(f"credential error: {exc}") from exc
    req = urllib.request.Request(authed)
    with urllib.request.build_opener(NoRedirect()).open(req, timeout=30) as resp:
        return read_json_response(resp)


def post_verification(source_json_str):
    base = "https://api.etherscan.io/v2/api?chainid=97&module=contract&action=verifysourcecode"
    try:
        authed = url_with_surrogate_query_param(base, CONNECTOR, allowed_hosts=HOSTS)
    except DynamicCredentialError as exc:
        raise SystemExit(f"credential error: {exc}") from exc
    body = urllib.parse.urlencode({
        "contractaddress": ADDRESS,
        "contractname": "SevenSigma",
        "compilerversion": "v0.8.26+commit.8a97fa7a",
        "optimizationUsed": "1",
        "runs": "200",
        "evmversion": "cancun",
        "licenseType": "3",
        "constructorArguements": CONSTRUCTOR_ARGS,
        "sourceCode": source_json_str,
    }).encode()
    req = urllib.request.Request(
        authed, data=body,
        headers={"Content-Type": "application/x-www-form-urlencoded"},
        method="POST")
    with urllib.request.build_opener(NoRedirect()).open(req, timeout=120) as resp:
        return read_json_response(resp)


def summarize_sourcecode(data):
    result = data.get("result")
    row = result[0] if isinstance(result, list) and result else result
    if not isinstance(row, dict):
        return {"status": data.get("status"), "message": data.get("message"), "result": str(row)[:300]}
    return {
        "status": data.get("status"),
        "message": data.get("message"),
        "ContractName": row.get("ContractName"),
        "CompilerVersion": row.get("CompilerVersion"),
        "OptimizationUsed": row.get("OptimizationUsed"),
        "Runs": row.get("Runs"),
        "EVMVersion": row.get("EVMVersion"),
        "LicenseType": row.get("LicenseType"),
        "SourceCode_chars": len(row.get("SourceCode") or ""),
        "ABI": row.get("ABI"),
    }


def main():
    out = {"address": ADDRESS, "chainId": 97}

    # Step 1: current status + Sourcify-forwarded guid status
    print("== step 1: current getsourcecode (chain 97) ==")
    before = get({"module": "contract", "action": "getsourcecode", "address": ADDRESS})
    out["getsourcecode_before"] = summarize_sourcecode(before)
    print(json.dumps(out["getsourcecode_before"], indent=2))
    if out["getsourcecode_before"].get("ContractName"):
        print("Already verified on BscScan testnet — stopping.")
        out["verified"] = True
        with open(RESULT_FILE, "w") as f:
            json.dump(out, f, indent=2)
        return 0

    print("== step 1b: Sourcify-forwarded Etherscan guid status ==")
    # No Sourcify-forwarded guid for this deploy: Sourcify's Etherscan
    # forwarding hit the daily 500-submission limit on 2026-11-01, so
    # there is no forwarded guid to check. An empty guid returns an
    # error (not Pass), so the script proceeds to direct submission.
    fwd_guid = ""
    fwd = get({"module": "contract", "action": "checkverifystatus", "guid": fwd_guid})
    out["sourcify_forwarded_guid"] = fwd_guid
    out["sourcify_forwarded_status"] = fwd
    print(json.dumps(fwd, indent=2))
    if isinstance(fwd, dict) and fwd.get("status") == "1" and "Pass" in str(fwd.get("result")):
        print("Forwarded verification already passed — re-checking sourcecode.")
        after = get({"module": "contract", "action": "getsourcecode", "address": ADDRESS})
        out["getsourcecode_after"] = summarize_sourcecode(after)
        print(json.dumps(out["getsourcecode_after"], indent=2))
        out["verified"] = bool(out["getsourcecode_after"].get("ContractName"))
        with open(RESULT_FILE, "w") as f:
            json.dump(out, f, indent=2)
        return 0 if out["verified"] else 1

    # Step 2: submit
    print("== step 2: submitting verifysourcecode ==")
    with open("/home/hatch/workspace/seven-sigma/verification/standard-json.json") as f:
        std_json = f.read()
    submit = post_verification(std_json)
    out["submit"] = submit
    print(json.dumps(submit, indent=2)[:800])
    guid = submit.get("result") if isinstance(submit, dict) else None
    if not guid or submit.get("status") != "1":
        print("Submission failed.")
        out["verified"] = False
        with open(RESULT_FILE, "w") as f:
            json.dump(out, f, indent=2)
        return 1
    out["guid"] = guid

    # Step 3: poll up to ~3 min
    print("== step 3: polling checkverifystatus ==")
    final = None
    for i in range(18):
        time.sleep(10)
        check = get({"module": "contract", "action": "checkverifystatus", "guid": guid})
        print(f"poll {i + 1}: {json.dumps(check)[:300]}")
        final = check
        if isinstance(check, dict) and check.get("result") and check["result"] != "Pending in queue":
            break
    out["checkverifystatus_final"] = final

    # Step 4: re-check getsourcecode
    print("== step 4: re-check getsourcecode ==")
    after = get({"module": "contract", "action": "getsourcecode", "address": ADDRESS})
    out["getsourcecode_after"] = summarize_sourcecode(after)
    print(json.dumps(out["getsourcecode_after"], indent=2))
    out["verified"] = bool(out["getsourcecode_after"].get("ContractName"))
    with open(RESULT_FILE, "w") as f:
        json.dump(out, f, indent=2)
    print("VERIFIED" if out["verified"] else "NOT verified")
    return 0 if out["verified"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
