const axios = require('axios');
const cheerio = require('cheerio');

axios.get('https://corp.tuko.co.ke/blog')
    .then(response => {
        const $ = cheerio.load(response.data); // Load the HTML
        const textContent = $('body').text(); // Extract text from the body tag

        // Clean up excessive whitespace and new lines
        const cleanedText = textContent.replace(/\s+/g, ' ').trim();

        console.log(cleanedText);
    })
    .catch(error => {
        console.error("Error fetching the page:", error);
    });
