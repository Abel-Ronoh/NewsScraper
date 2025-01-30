require('dotenv').config();
const axios = require('axios');
const cheerio = require('cheerio');
const { OpenAI } = require('openai');
const fs = require('fs');

// Initialize OpenAI client
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Retry logic function
async function requestWithRetry(url, retries = 3, delayMs = 3000) {
    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            const response = await axios.get(url, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
                },
                timeout: 10000 // Set timeout to 10 seconds
            });
            return response;
        } catch (error) {
            if (attempt < retries) {
                console.log(`Attempt ${attempt} failed. Retrying in ${delayMs / 1000} seconds...`);
                await delay(delayMs); // Wait before retrying
            } else {
                console.error(`Failed to fetch ${url} after ${retries} attempts`);
                throw error;
            }
        }
    }
}

// Function to scrape and summarize text from a URL
async function scrapeAndSummarize(url) {
    try {
        console.log(`Scraping: ${url}`);

        // Fetch the webpage content with retry logic
        const response = await requestWithRetry(url);

        const $ = cheerio.load(response.data);

        // Extract text content from the body, excluding unwanted parts (like ads, navs, footers)
        const textContent = $('body')
            .not('footer, header, nav, .ad, .sidebar') // Exclude unwanted sections
            .text();

        const cleanedText = textContent.replace(/\s+/g, ' ').trim();

        // Log part of the scraped text (first 500 characters for preview)
        console.log("Scraped text:", cleanedText.slice(0, 500));

        // Summarize with GPT API
        const summary = await summarizeText(cleanedText);
        console.log("\n📝 AI Summary:\n", summary);

        // Optionally, save the summary to a file
        const fileName = `news_summary_${new Date().toISOString()}.txt`;
        fs.writeFileSync(fileName, summary);

        console.log(`Summary saved to ${fileName}`);
        
    } catch (error) {
        console.error(`Error scraping ${url}:`, error.message);
    }
}

// Function to summarize text using GPT API and wrap each summary in brackets
async function summarizeText(text) {
    try {
        const response = await openai.chat.completions.create({
            model: "gpt-3.5-turbo",
            messages: [
                { role: "system", content: "You are a news summarization assistant." },
                { role: "user", content: `Summarize this news article in 2-3 sentences:\n\n${text}` }
            ],
            temperature: 0.7
        });

        // Get the summary and wrap it in brackets
        const summary = response.choices[0].message.content;
        return `[${summary}]`; // Wrap the response in brackets
    } catch (error) {
        console.error("GPT API Error:", error);
        return "[Failed to generate summary.]"; // Handle GPT errors gracefully
    }
}

// Respectful delay function (can be configured)
function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Scraping a list of URLs concurrently with delay handling
async function scrapeSite() {
    // Example URLs from the site (replace with real URLs)
    const urlsToScrape = [
        // 'https://corp.tuko.co.ke/blog',
        'https://citizen.digital/'
    ];

    // Loop through URLs and scrape them with a delay between requests
    const delayBetweenRequests = 2000; // Delay time in milliseconds (configurable)

    const promises = urlsToScrape.map(async (url) => {
        await scrapeAndSummarize(url);
        await delay(delayBetweenRequests);
    });

    // Run all the scrape tasks concurrently with proper delay handling
    await Promise.all(promises);
}

// Start the scraping process
scrapeSite().then(() => {
    console.log('Scraping completed successfully.');
}).catch(err => {
    console.error('Error in scraping process:', err);
});
