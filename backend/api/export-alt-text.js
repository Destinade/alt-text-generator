export default async function handler(req, res) {
    if (req.method === 'POST') {
        try {
            // Process the request data
            // For example, parse form data or JSON
            const data = req.body; // Assuming JSON data

            // Perform your logic here
            // For example, generate alt text

            // Send a response back to the client
            res.status(200).json({ message: 'Alt text generated successfully!', data: {} });
        } catch (error) {
            console.error('Error processing request:', error);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    } else {
        res.setHeader('Allow', ['POST']);
        res.status(405).end(`Method ${req.method} Not Allowed`);
    }
} 