# ElevenLabs Agent Analysis Configuration

## Required Analysis Tab Configuration

Configure your ElevenLabs agent with these exact settings:

### Data Collection Fields

```json
{
  "User_Goals": {
    "type": "array",
    "description": "Extract specific goals mentioned by the user during onboarding",
    "items": {
      "type": "object",
      "properties": {
        "original_text": {
          "type": "string",
          "description": "Exact phrase the user said about their goal"
        },
        "goal_category": {
          "type": "string",
          "description": "Category of the goal",
          "enum": ["career", "health", "personal", "financial", "relationships", "learning", "creativity"]
        },
        "timeline": {
          "type": "string", 
          "description": "When they want to achieve it",
          "enum": ["short_term", "medium_term", "long_term"]
        },
        "confidence_level": {
          "type": "number",
          "description": "How confident they sound about this goal (0-1)",
          "minimum": 0,
          "maximum": 1
        }
      }
    }
  },
  "User_Name": {
    "type": "string",
    "description": "The user's preferred name"
  },
  "Learning_Style": {
    "type": "string",
    "description": "How they prefer to learn",
    "enum": ["visual", "auditory", "kinesthetic", "reading", "mixed"]
  },
  "Time_Commitment": {
    "type": "string",
    "description": "How much time they can dedicate",
    "enum": ["minimal", "moderate", "intensive"]
  }
}
```

### Evaluation Criteria

```json
{
  "goal_clarity": {
    "description": "How clearly the user expressed their goals (1-10)",
    "type": "number",
    "range": [1, 10]
  },
  "engagement_level": {
    "description": "How engaged the user was in the conversation (1-10)", 
    "type": "number",
    "range": [1, 10]
  },
  "onboarding_completeness": {
    "description": "How much of the onboarding process was completed (%)",
    "type": "number",
    "range": [0, 100]
  }
}
```

### System Prompt Addition

Add this to your agent's system prompt:

```
GOAL EXTRACTION INSTRUCTIONS:
- Listen carefully for any goals, aspirations, or things the user wants to improve
- Extract the EXACT words they use - don't paraphrase
- Categorize goals appropriately
- Note their timeline preferences (short/medium/long term)
- Assess their confidence level when mentioning goals
- Always capture at least 1-3 specific goals during onboarding

IMPORTANT: When the conversation ends, ensure all mentioned goals are captured in the User_Goals field with original_text, goal_category, timeline, and confidence_level.
```