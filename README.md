Smart Banking System with Facial Recognition
Overview

The Smart Banking System is an AI-driven customer management solution designed to revolutionize the in-branch banking experience.
Using webcam-based facial recognition, the system identifies customers the moment they enter the bank and automatically fetches their history, behavior, and service requirements — enabling staff to deliver personalized, efficient, and emotion-aware customer service.

Project Goal

To build an intelligent, customer-aware banking system that:

Recognizes customers instantly via face recognition.

Displays their banking history, emotional profile, and service needs.

Allows staff to prioritize and assign counters based on customer category and situation.

Improves service quality, customer satisfaction, and operational efficiency.

Core Features

🏠 Home Page – Displays project overview and navigation to main modules.

📸 Webcam Entry Page – Captures live video input, detects faces, and identifies known customers from the database.

👤 Customer Recognition System

Identifies customer from a dummy database (10 entries).

Categorizes customers as HNW, VIP, Elderly, or Regular.

Detects predefined behavior/emotion (e.g., Angry, Anxious, Happy, Impatient).

📜 Customer History & Behavior Analysis

Shows customer’s previous visit records, including purpose, outcome, and staff notes.

Predicts current visit purpose based on last recorded issue.

Updates current visit automatically after service completion.

🏦 Smart Counter Allocation

Dynamically assigns customers to appropriate service counters:

Counter	Type	Description
Counter 1	HNW Clients	High-priority handling
Counter 2	VIP Clients	Corporate / VIP desk
Counter 3	Elderly	Assistance and guidance
Counter 4	Irate / Anxious	Complaint resolution zone
Counter 5	Regular	Standard banking operations

🗄️ Dummy Database

Includes 3+ sample customer profiles with category, emotion, last visit, and current visit fields.

Automatically updates visit_history and current_visit upon new entry.

🧠 Example Behavior Records

Angry – Previous transaction failed, needs apology and reassurance.

Anxious – Concerned about pending pension or investment updates.

Impatient – Waiting long for card delivery or account approval.

Confused – Struggles with digital banking tasks.

Happy – Received good service, positive mood.

⚙️ Tech Stack
This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS
