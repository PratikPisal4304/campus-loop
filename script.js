// =========================================================
// CAMPUS LOOP - FRONTEND JAVASCRIPT
// =========================================================


// =========================================================
// SIGNUP
// =========================================================

const signupForm = document.getElementById("signupForm");

if (signupForm) {

    signupForm.addEventListener("submit", function (event) {

        event.preventDefault();

        const name =
            document.getElementById("signupName").value.trim();

        const email =
            document.getElementById("signupEmail").value.trim();

        const password =
            document.getElementById("signupPassword").value;

        const confirmPassword =
            document.getElementById("signupConfirm").value;


        // Check fields
        if (!name || !email || !password || !confirmPassword) {

            alert("Please fill in all fields.");

            return;
        }


        // Password length
        if (password.length < 6) {

            alert("Password must be at least 6 characters.");

            return;
        }


        // Confirm password
        if (password !== confirmPassword) {

            alert("Passwords do not match.");

            return;
        }


        // Check existing account
        const existingUser =
            JSON.parse(localStorage.getItem("campusUser"));


        if (existingUser && existingUser.email === email) {

            alert("An account with this email already exists.");

            return;
        }


        // Create user
        const user = {

            name: name,

            email: email,

            password: password

        };


        // Save account
        localStorage.setItem(
            "campusUser",
            JSON.stringify(user)
        );


        alert(
            "Account created successfully! Please log in."
        );


        // Go to login
        window.location.href = "login.html";

    });

}


// =========================================================
// LOGIN
// =========================================================

const loginForm = document.getElementById("loginForm");

if (loginForm) {

    loginForm.addEventListener("submit", function (event) {

        event.preventDefault();


        const email =
            document.getElementById("loginEmail").value.trim();

        const password =
            document.getElementById("loginPassword").value;


        // Get saved account
        const savedUser =
            JSON.parse(localStorage.getItem("campusUser"));


        // No account
        if (!savedUser) {

            alert(
                "No account found. Please create an account first."
            );

            return;
        }


        // Check credentials
        if (
            email === savedUser.email &&
            password === savedUser.password
        ) {

            // Login successful
            localStorage.setItem(
                "loggedIn",
                "true"
            );

            localStorage.setItem(
                "currentUser",
                savedUser.name
            );

            localStorage.setItem(
                "currentEmail",
                savedUser.email
            );


            // Open dashboard
            window.location.href = "index.html";

        } else {

            alert("Invalid email or password.");

        }

    });

}


// =========================================================
// DASHBOARD USER
// =========================================================

function displayUser() {

    const loggedIn =
        localStorage.getItem("loggedIn");

    const currentUser =
        localStorage.getItem("currentUser");


    const userName =
        document.querySelector(".user-name");

    const userAvatar =
        document.querySelector(".user-avatar");


    if (loggedIn === "true" && currentUser) {


        // Show name
        if (userName) {

            userName.textContent = currentUser;

        }


        // Create initials
        if (userAvatar) {

            const initials = currentUser
                .split(" ")
                .map(word => word.charAt(0))
                .join("")
                .substring(0, 2)
                .toUpperCase();


            userAvatar.textContent = initials;

        }

    }

}


// =========================================================
// LOGOUT
// =========================================================

function logout() {

    localStorage.removeItem("loggedIn");

    localStorage.removeItem("currentUser");

    localStorage.removeItem("currentEmail");


    window.location.href = "login.html";

}


// =========================================================
// PASSWORD SHOW / HIDE
// =========================================================

function togglePassword() {

    const password =
        document.getElementById("loginPassword");


    if (!password) return;


    if (password.type === "password") {

        password.type = "text";

    } else {

        password.type = "password";

    }

}


// =========================================================
// FORGOT PASSWORD
// =========================================================

function forgotPassword(event) {

    event.preventDefault();

    alert(
        "Password reset can be connected later."
    );

}


// =========================================================
// GOOGLE LOGIN
// =========================================================

function googleLogin() {

    alert(
        "Google login will be added later."
    );

}


// =========================================================
// RUN AFTER PAGE LOAD
// =========================================================

document.addEventListener(
    "DOMContentLoaded",
    function () {

        displayUser();

    }
);