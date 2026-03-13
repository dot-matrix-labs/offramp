# Product Requirements Document (PRD): Weekly Recap Newsletter App

## 1. Product Vision & Value Proposition
**Core Problem:** Substack journalists spend too much time manually browsing Bloomberg and Yahoo News to find relevant articles and then formatting those links into a weekly recap newsletter. 
**Solution:** This application streamlines the process by integrating news feeds directly into a modern WYSIWYG writing environment, allowing journalists to search, curate (up to 5 articles), add a synopsis, and generate a formatted newsletter easily.
**Success Criteria:** A journalist can log in, search the past week's headlines from their preferred feeds, select up to 5 articles, write a synopsis, and seamlessly generate/publish their weekly newsletter.

## 2. Core Workflows & User Stories
**Primary "Happy Path":**
1. User signs up/logs in.
2. User defines or selects their default newsletter template.
3. User navigates to the "Draft Newsletter" view, interacting with the WYSIWYG editor.
4. User searches the integrated Bloomberg/Yahoo news feed within the app for recent articles.
5. User selects articles (up to 5), which are automatically embedded into the draft using their template.
6. User writes a top-level synopsis.
7. User exports the final HTML/content to publish to Substack.

**Key Entities:**
* **Journalist** (User)
* **Newsletter Template** (Visual layout definition)
* **Draft/Issue** (State: In Progress -> Published)
* **Article** (Metadata from external feeds like headline, link, snippet)

## 3. User Roles, Permissions, and Access
* **Roles:** Currently, there is only one primary role: **Journalist (Publisher)**. 
* **Permissions:** A Journalist can only access, edit, and view their own newsletters, templates, and profile settings. Standard user-level authorization applies.

## 4. External Integrations (Business Context)
1. **News Article Data:** 
   * Bloomberg News API / RSS
   * Yahoo News API / RSS
2. **Substack:** 
   * Primary integration will be exporting formatted HTML/text for the user to copy-paste into the Substack editor, as Substack does not have a widely open write API for drafting newsletters.

## 5. Test Credentials and Setup
* **Pending:** API Keys for Yahoo News and Bloomberg News. 
* *Note: The architecture requires an AI agent to build a "golden fixture" generator utilizing real test credentials. Once provided via a secure `.env` file, the testing tool will be completed to securely mock these external services in CI without hallucination.*
