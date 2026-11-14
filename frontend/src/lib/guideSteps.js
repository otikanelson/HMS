export const guideSteps = {
  ADMINISTRATOR: [
    {
      title: 'Welcome to Tender Care',
      content: (firstName, role) => `You are signed in as ${firstName}, ${role}. This takes one minute. You can open it again any time with the Help button at the top.`
    },
    {
      title: 'Find a patient',
      content: () => 'Type a patient number, name or phone number in the search box at the top, then press Enter. Click the patient\'s name to open their page.'
    },
    {
      title: 'Add a new patient',
      content: () => 'Choose New Patient in the menu. Fill in the patient number, name, phone number, and where the paper file is kept (cabinet, shelf, folder).'
    },
    {
      title: 'When a patient arrives',
      content: () => 'Open File Desk. Type the patient number to start the visit. Type blood pressure and heart rate while the paper file is being found. When the file is found, check the name and send the patient to the doctor.'
    },
    {
      title: 'After the consultation',
      content: () => 'Record the visit and file it, or leave the paper file on the desk and record it later today. Anything not filed yet stays at the top of File Desk in red, so nothing is forgotten.'
    },
    {
      title: 'Shifts and staff',
      content: () => 'Schedule shows who works day, night or is off. Staff lists everyone with their phone number.'
    },
    {
      title: 'Payroll and Reports',
      content: () => 'Payroll: create a run each month, add any bonus or deduction, approve it, pay by bank transfer, then mark it paid. Reports shows who did what in the system.'
    },
    {
      title: 'Notices and your notes',
      content: () => 'On Home you can post notices that everyone sees, and keep private notes that only you see.'
    },
    {
      title: 'That\'s it',
      content: () => 'If you forget your password, ask the Administrator. They will reset it with you in person.'
    }
  ],
  RECORDS_OPERATOR: [
    {
      title: 'Welcome to Tender Care',
      content: (firstName, role) => `You are signed in as ${firstName}, ${role}. This takes one minute. You can open it again any time with the Help button at the top.`
    },
    {
      title: 'Find a patient',
      content: () => 'Type a patient number, name or phone number in the search box at the top, then press Enter. Click the patient\'s name to open their page.'
    },
    {
      title: 'Add a new patient',
      content: () => 'Choose New Patient in the menu. Fill in the patient number, name, phone number, and where the paper file is kept (cabinet, shelf, folder).'
    },
    {
      title: 'When a patient arrives',
      content: () => 'Open File Desk. Type the patient number to start the visit. Type blood pressure and heart rate while the paper file is being found. When the file is found, check the name and send the patient to the doctor.'
    },
    {
      title: 'After the consultation',
      content: () => 'Record the visit and file it, or leave the paper file on the desk and record it later today. Anything not filed yet stays at the top of File Desk in red, so nothing is forgotten.'
    },
    {
      title: 'Shifts and staff',
      content: () => 'Schedule shows who works day, night or is off. Staff lists everyone with their phone number.'
    },
    {
      title: 'That\'s it',
      content: () => 'If you forget your password, ask the Administrator. They will reset it with you in person.'
    }
  ],
  CLINICAL_STAFF: [
    {
      title: 'Welcome to Tender Care',
      content: (firstName, role) => `You are signed in as ${firstName}, ${role}. This takes one minute. You can open it again any time with the Help button at the top.`
    },
    {
      title: 'Find a patient',
      content: () => 'Type a patient number, name or phone number in the search box at the top, then press Enter. Click the patient\'s name to open their page.'
    },
    {
      title: 'When a patient arrives',
      content: () => 'Open File Desk. Type the patient number to start the visit. Type blood pressure and heart rate while the paper file is being found. When the file is found, check the name and send the patient to the doctor.'
    },
    {
      title: 'After the consultation',
      content: () => 'Record the visit and file it, or leave the paper file on the desk and record it later today. Anything not filed yet stays at the top of File Desk in red, so nothing is forgotten.'
    },
    {
      title: 'Your shift',
      content: () => 'Home shows your week at a glance. Schedule shows everyone\'s shifts.'
    },
    {
      title: 'Admit or discharge',
      content: () => 'Open the patient\'s page and use the Admit patient or Discharge patient button.'
    },
    {
      title: 'That\'s it',
      content: () => 'If you forget your password, ask the Administrator. They will reset it with you in person.'
    }
  ]
};

export const getStepsForUser = (accessLevel) => {
  return guideSteps[accessLevel] || guideSteps.CLINICAL_STAFF;
};
