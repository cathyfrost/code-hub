async function test() {
  const res = await fetch("http://127.0.0.1:2358/submissions?base64_encoded=false&wait=true", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      source_code: "print(123)",
      language_id: 71
    })
  });
  console.log("Status:", res.status);
  const text = await res.text();
  console.log("Body:", text);
}
test();