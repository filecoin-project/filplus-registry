# Fil+ Registry Frontend

Welcome to the Fil+ Registry Frontend repository. This web application is a crucial component of the Fil+ program, providing an interactive interface for notaries and Root Key Holders to manage datacap allocations efficiently.

## Overview

The Fil+ Registry is accessible at [https://filplus-registry.netlify.app/](https://filplus-registry.netlify.app/) and serves as a centralized platform for notaries and Root Key Holders involved in the Fil+ program. It facilitates the process of triggering, proposing, and approving datacap allocations to clients, streamlining the overall workflow and enhancing transparency.

## Features

- **Datacap Allocation**: Enables notaries and Root Key Holders to propose and approve datacap allocations.
- **User-Friendly Interface**: Simplifies the process of managing datacap requests and approvals.
- **Real-Time Updates**: Keeps all stakeholders informed with the latest status of datacap allocations.
- **Secure and Reliable**: Ensures the integrity and confidentiality of the datacap allocation process.

# Related Projects

- [Fil+ Backend](https://github.com/filecoin-project/filplus-backend)
- [Fil+ SSA Bot](https://github.com/filecoin-project/filplus-ssa-bot)
- [Fil+ Application Repository (Falcon)](https://github.com/filecoin-project/filecoin-plus-falcon)

## Contribution

As an open-source project, we welcome and encourage the community to contribute to the Filplus SSA Bot. Your insights and improvements are valuable to us.Here's how you can contribute:

- **Fork the Repository**: Start by forking the repository to your GitHub account.
- **Clone the Forked Repository**: Clone it to your local machine for development purposes.
- **Create a New Branch**: Always create a new branch for your changes.
- **Make Your Changes**: Implement your features, bug fixes, or improvements.
- **Commit Your Changes**: Make sure to write clear, concise commit messages.
- **Push to Your Fork**: Push your changes to your forked repository.
- **Create a Pull Request**: Submit a pull request from your forked repository to our main repository.

Please read through our [CONTRIBUTING.md](CONTRIBUTING.md) file for detailed instructions on how to contribute.

## Getting Started

To get started with the Fil+ Registry Frontend, you can visit the live application at [https://filplus-registry.netlify.app/](https://filplus-registry.netlify.app/). For developers interested in contributing or setting up a local version, follow the instructions below:

### Prerequisites

- Ensure you have a modern web browser installed (e.g., Chrome, Firefox, Safari).
- For local development, you will need Node.js and npm installed on your machine.

### Installation for Local Development

1. **Clone the Repository**

   ```bash
   git clone https://github.com/filecoin-project/filplus-registry.git
   cd filplus-registry
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```
3. **Create .env file**
   ```bash
   # Please, request access to Environment Variables
   NEXT_PUBLIC_API_URL
   NEXT_PUBLIC_DMOB_API_KEY
   NEXT_PUBLIC_NODE_ADDRESS
   NEXT_PUBLIC_NODE_TOKEN
   GITHUB_ID
   GITHUB_SECRET
   NEXT_PUBLIC_MODE=development
   NEXT_PUBLIC_IS_TESTNET
   ```

## Support and Community

If you have any questions, suggestions, or need assistance, please reach out to our community channels. We strive to build a welcoming and supportive environment for all our contributors and users.

## License

This project is dual-licensed under the `Permissive License Stack`, which means you can choose to use the project under either:

- The Apache License 2.0, which is a free and open-source license, focusing on patent rights and copyright notices. For more details, see the [Apache License 2.0](https://www.apache.org/licenses/LICENSE-2.0).

- The MIT License, a permissive and open-source license, known for its broad permissions and limited restrictions. For more details, see the [MIT License](https://opensource.org/licenses/MIT).

You may not use the contents of this repository except in compliance with one of these licenses. For an extended clarification of the intent behind the choice of licensing, please refer to the `LICENSE` file in this repository or visit [Permissive License Stack Explanation](https://protocol.ai/blog/announcing-the-permissive-license-stack/).

For the full license text, please see the [LICENSE](LICENSE) file in this repository.

[![Netlify Status](https://api.netlify.com/api/v1/badges/af2318b1-1bde-4385-b78e-d1d0a6bb0b82/deploy-status)](https://app.netlify.com/sites/filplus-registry/deploys)
