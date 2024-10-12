document.addEventListener('DOMContentLoaded', function() {
    let logedin = localStorage.getItem('logedin') === 'true';
    let username = localStorage.getItem('username');

    // Update profile image and username based on login status
    const loginImg = document.getElementById('loginpng');
    const signupImg = document.getElementById('signupb');
    const usernameTxt = document.getElementById("usernametxt");
    const profilepng = document.getElementById('profilepng'); 
    const usernameprofiletxt = document.getElementById('usernameprofiletxt'); 
    const bioParagraph = document.getElementById('bio');
    const bioInput = document.getElementById('bioInput');
    const editButton = document.getElementById('Edit');
    const saveButton = document.getElementById('Save');
    const profileFileInput = document.getElementById('profileFileInput');
    const genericFileInput = document.getElementById('genericFileInput');
    const uploadButton = document.getElementById('upload');

    if (logedin) {
        loginImg.src = `/myproject/Website/profiles/${username}.png?${new Date().getTime()}`;
        loginImg.alt = "Profile";
        usernameTxt.innerHTML = `${username}`;
        usernameTxt.style.display = 'block';

        if (profilepng && usernameprofiletxt) {
            profilepng.src = `/myproject/Website/profiles/${username}.png?${new Date().getTime()}`;
            profilepng.alt = "Profile";
            usernameprofiletxt.innerHTML = `${username}`;
            usernameprofiletxt.style.display = 'block';
        } 

        if (profilepng === false) {
            profilepng.src = "/myprojects/assets/login icon.png";
        }

        if (signupImg) {
            signupImg.style.display = 'none';
        }

        // Fetch bio from server
        fetch(`/getBio?username=${username}`)
            .then(response => response.json())
            .then(data => {
                if (data.bio) {
                    bioParagraph.textContent = data.bio;
                } else {
                    bioParagraph.textContent = 'None yet.';
                }
            })
            .catch(error => console.error('Error fetching bio:', error));
    } else {
        loginImg.src = "assets/login icon.png";
        loginImg.alt = "Login";
        usernameTxt.style.display = 'none';
        signupImg.style.display = 'block';
        signupImg.src = "assets/singup.png";
    }

    loginImg.addEventListener('click', function() {
        if (logedin) {
            window.location.href = '/profile.html';
        } else {
            window.location.href = '/login.html';
        }
    });

    const searchForm = document.getElementById('searchForm');
    searchForm.addEventListener('submit', function(event) {
        event.preventDefault();
        
        const query = document.getElementById('searchQuery').value;
        
        if (query) {
            fetch(`/getUserProfileImage?username=${encodeURIComponent(query)}`)
            .then(response => {
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                return response.json();
            })
            .then(data => {
                if (data.success) {
                    localStorage.setItem('searchResult', JSON.stringify({ username: data.username, imageUrl: data.imageUrl }));
                    window.location.href = '/searchresult.html'; // Ensure this redirects to the correct page
                } else {
                    alert(data.message || 'Profile image not found.');
                }
            })
            .catch(error => {
                console.error('Error fetching profile image:', error);
                alert('An error occurred while fetching the profile image.');
            });
        }
    });
    
    // Handle search result display
    const displaySearchResult = () => {
        const searchResult = JSON.parse(localStorage.getItem('searchResult'));
        const resultsContainer = document.getElementById('resultsContainer');

        if (searchResult) {
            const profileDiv = document.createElement('div');
            profileDiv.classList.add('profile-result');

            const img = document.createElement('img');
            img.src = searchResult.imageUrl;
            img.alt = `${searchResult.username}'s Profile Image`;
            img.classList.add('profile-img');

            const usernameText = document.createElement('p');
            usernameText.textContent = searchResult.username;

            profileDiv.appendChild(img);
            profileDiv.appendChild(usernameText);

            resultsContainer.appendChild(profileDiv);
            
        } else {
            resultsContainer.textContent = 'No results found.';
        }
    };

    // Call the function to display search results only if on the correct page
    if (window.location.pathname === '/searchresult.html') {
        displaySearchResult();
    }

    // Edit button functionality
    editButton.addEventListener('click', function() {
        bioInput.value = bioParagraph.textContent; // Populate textarea with bio text
        bioParagraph.style.display = 'none';
        bioInput.style.display = 'block';
        editButton.style.display = 'none';
        saveButton.style.display = 'block';
    });

    // Save button functionality
    saveButton.addEventListener('click', function() {
        const newBio = bioInput.value;

        fetch('/updateBio', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, bio: newBio })
        })
        .then(response => {
            if (response.ok) {
                bioParagraph.textContent = newBio; // Update paragraph with textarea text
                bioParagraph.style.display = 'block';
                bioInput.style.display = 'none';
                editButton.style.display = 'block';
                saveButton.style.display = 'none';
            } else {
                console.error('Failed to update bio');
            }
        })
        .catch(error => console.error('Error:', error));
    });

    // Handle profile image upload
    profilepng.addEventListener('click', function(event) {
        profileFileInput.click();
    });

    profileFileInput.addEventListener('change', function() {
        const file = profileFileInput.files[0];
        if (file) {
            const formData = new FormData();
            formData.append('profileImage', file);
            formData.append('username', username);

            fetch('/uploadProfileImage', {
                method: 'POST',
                body: formData
            })
            .then(response => response.text())
            .then(result => {
                console.log(result); // Success message or handle as needed
                // Update profile image after upload
                profilepng.src = `/myproject/Website/profiles/${username}.png?${new Date().getTime()}`;
            })
            .catch(error => console.error('Error uploading image:', error));
        }
    });

    uploadButton.addEventListener('click', function() {
        genericFileInput.click();
    });

    genericFileInput.addEventListener('change', function() {
        const file = genericFileInput.files[0];
        if (file) {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('username', username); // Send the username with the request

            fetch('/uploadFile', {
                method: 'POST',
                body: formData
            })
            .then(response => response.text())
            .then(result => {
                console.log(result); // Handle success message
            })
            .catch(error => console.error('Error uploading file:', error));
        }
    });

    document.getElementById('logout').addEventListener('click', function() {
        localStorage.removeItem('logedin');
        localStorage.removeItem('username');
        window.location.href = 'index.html';
    });
});
