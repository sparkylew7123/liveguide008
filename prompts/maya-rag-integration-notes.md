# Maya RAG Document Integration Notes

## Key Elements Added from Operational Guardrails Document

### 1. **Prohibited Topics Section** (NEW)
Previously our prompt only had general boundaries. Now explicitly lists:
- Self-harm and suicide
- Criminal activities
- Exploitation and abuse
- Substance abuse facilitation
- Gambling strategies
- Sexually explicit content

### 2. **Professional Boundaries with Disclaimers** (ENHANCED)
Original prompt mentioned redirecting medical/legal issues, but now includes:
- Specific disclaimer language for medical, financial, and legal topics
- Clear statements: "This is general information only, not [medical/financial/legal] advice"
- Direction to consult appropriate professionals

### 3. **Crisis Response Protocol** (NEW)
Complete script for emergency situations:
- Acknowledgment of difficulty
- Emergency numbers for US (911, 988) and UK (999, 111)
- Immediate action guidance
- This was completely missing from original prompt

### 4. **Privacy Commitment Details** (ENHANCED)
Original only mentioned goals are private. Now includes:
- Data anonymization practices
- User control over information
- Confidentiality commitment
- Instruction not to discuss data storage specifics

### 5. **Four-Step Redirection Protocol** (NEW)
Structured approach when boundaries are approached:
1. Acknowledge without judgment
2. Explain limitation
3. Redirect constructively
4. Suggest appropriate resources

### 6. **Ethical Standards Section** (NEW)
- Explicit bias avoidance guidelines
- Protected characteristics awareness
- Neutral language requirements
- Privacy protection specifics (passwords, financial details)

### 7. **Documentation Requirements** (NEW)
- Document patterns of prohibited requests
- Flag repeated boundary violations
- Maintain referral records

## Elements NOT Included (Already Covered or Irrelevant)

### Already Covered:
- General boundary setting (we had this)
- Redirecting to professionals (we had this)
- Maintaining professional courtesy (implicit in personality)

### Not Relevant for Maya's Onboarding Role:
- Detailed UK vs US service numbers (kept essential ones)
- Extensive legal compliance details
- Third-party sharing policies (handled by platform)
- Technical database details

## Why This Integration Matters

1. **Safety First**: The crisis response protocol is critical for user safety
2. **Legal Protection**: Clear disclaimers protect both users and platform
3. **Consistency**: All LiveGuide agents follow same operational standards
4. **Trust Building**: Transparent about boundaries while remaining supportive
5. **Ethical AI**: Explicit bias prevention and privacy protection

## Recommended Implementation

The complete prompt (`maya-elevenlabs-complete.txt`) should be used as it:
- Maintains Maya's warm personality while adding safety guardrails
- Provides specific scripts for difficult situations
- Balances helpful guidance with appropriate boundaries
- Ensures compliance with ethical and legal standards

The RAG document's operational guardrails are now fully integrated into Maya's system prompt, eliminating the need for a separate knowledge base document in ElevenLabs.