def test_health_ok(fake_client):
    resp = fake_client.get("/health")
    assert resp.status_code == 200
    assert resp.json() == {"status": "ok"}


def test_executor_health_reports_backend(fake_client):
    resp = fake_client.get("/health/executor")
    assert resp.status_code == 200
    body = resp.json()
    assert body["status"] == "ok"
    assert body["backend"] == "fake"
