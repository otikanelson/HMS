export const guideSteps = {
  // Shared step objects
  welcome: {
    title: 'Welcome to Tender Care',
    content: (firstName, role) => `You are signed in as ${firstName}, ${role}. This takes about two minutes. Open it again any time with the Help button.`,
    target: 'help-button'
  },
  startVisit: {
    title: 'Start a visit',
    content: 'Open **File Desk**. Type the patient\'s file number and press Enter, then press Enter again to start the visit. If the number is new, type the name and press **Add and start visit**.',
    route: '/file-desk',
    target: 'desk-number'
  },
  finding: {
    title: 'Finding the file',
    content: 'New visits wait here while someone finds the paper file. The shelf location shows on the card. Enter **BP and heart rate**, and when the file is in your hand and the name matches, press **Send to doctor**.',
    route: '/file-desk',
    target: 'desk-finding',
    snapshot: 3
  },
  withDoctor: {
    title: 'With the doctor',
    content: 'The doctor writes on the paper file as usual. Nothing needs typing here. When the file comes back, press **File is back**.',
    route: '/file-desk',
    target: 'desk-doctor',
    snapshot: 4
  },
  putBack: {
    title: 'Put back',
    content: 'Files that are back wait here in shelf order, with where each one goes. Put it on its shelf and press **Put away**. At the end of the shift you can press **Everything is back on the shelves**. Press **Hide** to tuck this panel away.',
    target: 'put-back-dropdown',
    route: '/file-desk',
    highlight: true,
    animate: true,
    openMenu: true
  },
  mistake: {
    title: 'Made a mistake?',
    content: 'Press **Undo** on a card to cancel a visit started by mistake or to go back one step. Nothing recorded is lost.',
    route: '/file-desk',
    target: 'desk-columns'
  },
  notes: {
    title: 'Notes are optional',
    content: 'The paper file is the main record. If you want to keep the diagnosis or medicines in the system too, open the visit and press **Add notes**. Nobody has to.'
  },
  findPatient: {
    title: 'Find a patient',
    content: 'Type a file number, name or phone number and press Enter. The result shows where the file is kept.',
    target: 'top-search'
  },
  newPatient: {
    title: 'Add a patient early',
    content: 'Use **New Patient** to add someone before their visit: file number, name, and a phone number if you have one. Where the file is kept is worked out from its number.',
    target: 'side-new-patient'
  },
  storageMap: {
    title: 'Storage map',
    content: 'This tells the system which shelf area each file number belongs to (section, tier and column). Change it only when you add shelves or move files.',
    target: 'side-storage-map'
  },
  schedule: {
    title: 'Shifts',
    content: 'Schedule shows who works days, nights, or is off.',
    target: 'side-schedule'
  },
  staff: {
    title: 'Staff',
    content: 'Staff lists everyone with their phone number.',
    target: 'side-staff'
  },
  payroll: {
    title: 'Payroll and Reports',
    content: 'Payroll: create a run each month, add any bonus or deduction, approve it, pay by bank transfer, then mark it paid. **Reports** shows who did what in the system. **Password requests** appear there too. Open one, choose a password and tell the staff member.',
    target: 'side-payroll'
  },
  notices: {
    title: 'Notices and your notes',
    content: 'On Home you can post notices everyone sees, and keep private notes only you see.',
    route: '/dashboard',
    target: 'home-notices'
  },
  myShift: {
    title: 'Your shift',
    content: 'Home shows your week at a glance.',
    route: '/dashboard',
    target: 'home-shift'
  },
  admitDischarge: {
    title: 'Admit or discharge',
    content: 'Open the patient\'s page and use **Admit patient** or **Discharge patient**.',
    target: 'admit-discharge-button',
    route: '/patients',
    highlight: true,
    animate: true
  },
  thatsIt: {
    title: 'That\'s it',
    content: 'Press **Help** any time to see this again. If you forget your password, ask the Administrator. They will reset it with you in person.',
    target: 'help-button'
  }
};

export const getStepsForUser = (accessLevel) => {
  const createRoleSteps = (roleSteps) => roleSteps.map(key => guideSteps[key]);

  const administratorSteps = [
    'welcome', 'startVisit', 'finding', 'withDoctor', 'putBack', 'mistake',
    'notes', 'findPatient', 'newPatient', 'storageMap', 'schedule', 'staff',
    'payroll', 'notices', 'thatsIt'
  ];

  const recordsOperatorSteps = [
    'welcome', 'startVisit', 'finding', 'withDoctor', 'putBack', 'mistake',
    'notes', 'findPatient', 'newPatient', 'schedule', 'staff', 'thatsIt'
  ];

  const clinicalStaffSteps = [
    'welcome', 'startVisit', 'finding', 'withDoctor', 'putBack', 'mistake',
    'findPatient', 'myShift', 'admitDischarge', 'schedule', 'thatsIt'
  ];

  if (accessLevel === 'ADMINISTRATOR') {
    return createRoleSteps(administratorSteps);
  } else if (accessLevel === 'RECORDS_OPERATOR') {
    return createRoleSteps(recordsOperatorSteps);
  } else {
    return createRoleSteps(clinicalStaffSteps);
  }
};
