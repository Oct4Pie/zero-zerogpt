# Zero-ZeroGPT

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![React](https://img.shields.io/badge/React-18.3.1-blue.svg)](https://reactjs.org/)
[![Material-UI](https://img.shields.io/badge/Material--UI-5.15.20-blue.svg)](https://mui.com/)

## Table of Contents
- [What is Zero-ZeroGPT?](#what-is-zero-zerogpt)
- [Live Demo](#live-demo)
- [AI Detection Approach](#ai-detection-approach)
- [Unicode Spacing Technique](#unicode-spacing-technique)
- [Examples](#examples)
- [Installation and Usage](#installation-and-usage)
- [Contributing](#contributing)
- [Disclaimer](#disclaimer)
- [License](#license)

## What is Zero-ZeroGPT?

Zero-ZeroGPT is a demonstration application that showcases how replacing standard spaces with various Unicode space characters can affect the detection of AI-generated text by common AI detection tools like **GPTZero** and **ZeroGPT**. This project looks to explore the limitations of current AI detection methods and promote discussion about more robust processing techniques.

## Live Demo

Experience Zero-ZeroGPT in action: [https://oct4pie.github.io/zero-zerogpt](https://oct4pie.github.io/zero-zerogpt)

## AI Detection Approach

Most tools designed to identify text generated by AI models use several techniques:

1. **Pattern Analysis**: Detects unusual word choices, repetitive patterns, and syntactic structures.
2. **Linguistic Analysis**: Examines grammatical structures, coherence, and context to measure inconsistencies.
3. **Statistical Analysis**: Compares the statistical distribution of words and phrases to identify anomalies.

## Unicode Spacing Technique

AI detection tools generally tokenize text based on standard spaces. By replacing these spaces with special Unicode characters, it's possible to disrupt the tokenization process:

1. **Tokenization Disruption**: Many detection models split text into tokens based on spaces. When Unicode spaces are used, these tools fail to recognize them as standard spaces.
2. **Statistical Alteration**: The statistical features of the text are changed when spaces are replaced with Unicode spaces, preventing the model from matching the text with its learned patterns.
3. **Pattern Interference**: Unicode spaces can disrupt the detection model's ability to identify typical text patterns.

## Examples

Here are some visual examples demonstrating the effect of Unicode spacing on AI detection tools:

<img src="https://imgur.com/3DXbu23.png" width="95%" alt="Example 1: Original text detected as AI-generated">
<img src="https://imgur.com/vrJuDMW.png" width="95%" alt="Example 2: Text with Unicode spaces bypassing detection">
<img src="https://imgur.com/nbyNUdM.png" width="95%" alt="Example 3: Another instance of detection evasion">
<img src="https://i.imgur.com/tEI3VZ6.png" width="95%" alt="Example 4: Comparison of different Unicode space effects">

## Installation and Usage

### Prerequisites

- Node.js (v14.0.0 or later)
- npm (v6.0.0 or later)

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/oct4pie/zero-zerogpt.git
   cd zero-zerogpt
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

### Running Locally

1. Start the development server:
   ```bash
   npm start
   ```

2. Open your browser and navigate to `http://localhost:3000`

### Usage Instructions

1. Enter your text in the input field.
2. Experiment with different Unicode spaces using the predefined options or create your own combination.
3. Copy the modified text and test it in various AI detection tools.
4. Use the "Clear Text" button to reset the input field.

## Contributing

We welcome contributions to Zero-ZeroGPT! Please follow these steps to contribute:

1. Fork the repository
2. Create a new branch: `git checkout -b feature/your-feature-name`
3. Make your changes and commit them: `git commit -m 'Add some feature'`
4. Push to the branch: `git push origin feature/your-feature-name`
5. Submit a pull request

Please read our [Contributing Guidelines](CONTRIBUTING.md) for more details.

## Disclaimer

This project **does not promote plagiarism or the misuse of AI technology**. It is intended solely for educational and demonstration purposes to show the limitations of current AI detection methods and encourage the development of more reliable techniques. Users are responsible for ensuring their use of this tool complies with relevant policies and regulations.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.