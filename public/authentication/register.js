document.addEventListener("DOMContentLoaded", function () {
const form = document.getElementById("signupForm");
const errorBox = document.getElementById("signupError");

form.addEventListener("submit", async function (e) {
    e.preventDefault();
    errorBox.textContent = "";

    const firstName = document.getElementById("firstname").value.trim();
    const lastName = document.getElementById("lastname").value.trim();
    const email = document.getElementById("Email").value.trim();
    const username = document.getElementById("username").value.trim();
    const password = document.getElementById("password").value;
    const repassword = document.getElementById("repassword").value;

    //check if every field is entered
    if(!firstName || !lastName || !email || !username || !password || !repassword){
        errorBox.textContent = "Every field needs to be entered.";
        return;
    }
    //check for password correctness
    if (password !== repassword) {
    errorBox.textContent = "Password entered are not the same.";
    return;
    }

    try {
        const res = await fetch("/api/signup-start", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ firstName, lastName, email, username, password }),
        });

        let data;
        try{
            data = await res.json();
        } catch(e){
            data = { ok:false, message:"Invalid response from server." };
        }

        if(!res.ok || !data.ok){
            errorBox.textContent = data.message || "Failed to register account.";
            return;
        }

        const signupId = data.signupId;
        if(!signupId){
            errorBox.textContent = "Missing signupId from server.";
            return;
        }

        alert("Verification code has been sent to your email.");

        //get code
        const code = window.prompt("Enter the verification code sent to your email:");
        if(!code){
            errorBox.textContent = "Verification cancelled.";
            return;
        }

        //get signup-verify
        const verifyRes = await fetch("/api/signup-verify", {
            method:"POST",
            headers:{ "Content-Type":"application/json" },
            body:JSON.stringify({ signupId, code })
        });

        let verifyData;
        try{
            verifyData = await verifyRes.json();
        } catch(error){
            verifyData = { ok:false, message:"Invalid response from server(verify)." };
        }

        if(!verifyRes.ok || !verifyData.ok){
            errorBox.textContent = verifyData.message || "Failed to verify email.";
            return;
        }

        alert("Registration complete. Please sign in.");
        window.location.href = "/login.html";
    } catch (err) {
        console.error("Registration error:", err);
        errorBox.textContent = "Error while reaching the server.";
    }
});
});