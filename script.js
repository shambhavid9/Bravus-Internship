const form = document.getElementById("contact-form");

form.addEventListener("submit", function(event) {
    event.preventDefault();

    const name = document.getElementById("name").value.trim();
    const email = document.getElementById("email").value.trim();
    const message = document.getElementById("message").value.trim();

    if (name === "" || email === "" || message === "") {
        document.getElementById("form-message").innerText =
            "Please fill all the fields.";
        return;
    }

    fetch("http://localhost:3001/api/enquiries", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },

        body: JSON.stringify({
            name: name,
            email: email,
            message: message
        })
    })
    .then(function(response) {
        return response.json().then(function(data) {

            if (!response.ok) {
                throw new Error(data.message);
            }

            return data;
        });
    })
    .then(function(data) {
        document.getElementById("form-message").innerText =
            data.message;
    })
    .catch(function(error) {
        document.getElementById("form-message").innerText =
            error.message;
    });
});
