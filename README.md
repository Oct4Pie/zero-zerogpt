
# Zero-ZeroGPT

## What is it?
This is a demonstration application. It showcases how replacing standard spaces with various Unicode space characters can affect the detection of AI-generated text by common AI detection tools like **GPTZero** and **ZeroGPT**.

## AI Detection Approach
Most tools designed to identify text generated by AI models use a few techniques to detect AI-generated content:

- **Pattern**: Detects unusual word choices, repetitive patterns, and syntactic structures
- **Linguistics**: Looks at grammatical structures, coherence, and context to measure inconsistencies.
- **Statistics**: Compares the statistical distribution of words and phrases to identify anomalies.

## Unicode Spacing
AI detection tools generally tokenize text based on standard spaces. By replacing these spaces with special inicode characters, it is possible to disrupt the tokenization process

### Tokenization and Prediction
1. **Tokenization**: Many detection models split text into tokens based on spaces. When unicode spaces are used, these tools will fail to recognize them as standard spaces.
2. **Statistics**: The statistical features of the text are changed when spaces are replaced with unicode spaces. This prevents the model from matching the text with its learned patterns.
3. **Patterns**: Unicode spaces can disrupt the detection model's ability to identify typical text patterns.

## Disclaimer
This project **does not promote plagiarism or the misuse of AI technology**. It is intended solely for educational and demonstration purposes to show the limitations of current AI detection methods and the need for more reliable processing techniques.

## Usage
1. **Enter Text**: Input the text you want to experiment with in the provided text field.
2. **Clear Text**: Click the "Clear Text" button to reset the input field.
3. **Replace Spaces**: The application will automatically replace standard spaces in your text with different Unicode spaces, demonstrating the impact on AI detection.
4. **Copy Modified Text**: Use the copy button to copy the modified text to the clipboard.

## Run Locally
1. **Clone the Repository**:
   ```bash
   git clone https://github.com/yourusername/zero-zerogpt.git
   cd zero-zerogpt
   ```

2. **Install Dependencies**:
   ```bash
   npm install
   ```

3. **Run the Application**:
   ```bash
   npm start
   ```
