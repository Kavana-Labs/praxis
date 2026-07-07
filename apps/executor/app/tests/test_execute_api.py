"""API-level tests for /execute/python (request validation + response shape)."""


def test_execute_success_shape(fake_client):
    resp = fake_client.post("/execute/python", json={"code": "print('hi')"})
    assert resp.status_code == 200
    body = resp.json()
    # camelCase contract
    assert set(["executionId", "status", "stdout", "stderr", "exitCode", "durationMs", "artifacts"]) <= set(body)
    assert body["status"] == "success"
    assert body["exitCode"] == 0


def test_execute_accepts_camelcase_timeout(fake_client):
    resp = fake_client.post(
        "/execute/python", json={"code": "print('hi')", "timeoutSeconds": 5}
    )
    assert resp.status_code == 200


def test_execute_user_error_is_200_with_category(fake_client):
    resp = fake_client.post("/execute/python", json={"code": "x = 1/0  # praxis:error"})
    assert resp.status_code == 200
    body = resp.json()
    assert body["status"] == "error"
    assert body["errorCategory"] == "USER_CODE_ERROR"


def test_execute_timeout_maps_to_resource_limit(fake_client):
    resp = fake_client.post(
        "/execute/python", json={"code": "spin()  # praxis:timeout"}
    )
    body = resp.json()
    assert body["status"] == "error"
    assert body["errorCategory"] == "RESOURCE_LIMIT"


def test_execute_returns_artifacts(fake_client):
    resp = fake_client.post(
        "/execute/python", json={"code": "plt.savefig('x.png')  # praxis:artifact"}
    )
    body = resp.json()
    assert body["status"] == "success"
    assert len(body["artifacts"]) == 1
    art = body["artifacts"][0]
    assert art["mimeType"] == "image/png"
    assert art["dataUrl"].startswith("data:image/png;base64,")


def test_execute_sandbox_violation_category(fake_client):
    resp = fake_client.post(
        "/execute/python", json={"code": "urlopen('http://x')  # praxis:sandbox"}
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["status"] == "error"
    assert body["errorCategory"] == "SANDBOX_VIOLATION"


def test_empty_code_is_rejected(fake_client):
    resp = fake_client.post("/execute/python", json={"code": ""})
    assert resp.status_code == 422  # pydantic validation error
    body = resp.json()
    assert body["errorCategory"] == "VALIDATION_ERROR"
    assert body["status"] == "error"


def test_missing_code_is_rejected(fake_client):
    resp = fake_client.post("/execute/python", json={"timeoutSeconds": 5})
    assert resp.status_code == 422


def test_timeout_out_of_range_is_rejected(fake_client):
    resp = fake_client.post("/execute/python", json={"code": "print(1)", "timeoutSeconds": 999})
    assert resp.status_code == 422
