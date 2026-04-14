import app from "./app.js" 

const PORT = process.env.PORT || 3000;// Start the server
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}/home/index.html`));// Export the app for testing purposes