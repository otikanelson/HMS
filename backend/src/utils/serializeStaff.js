/**
 * Serialize staff data based on requester's access level
 * Implements tiered access control:
 * - Directory tier: everyone sees basic info
 * - Operational tier: Admin/Records Operator for anyone, Clinical Staff only for self
 * - Sensitive tier: Admin for anyone, Clinical Staff only for self
 */
function serializeStaffForRequester(staffDoc, requester) {
  const isSelf = requester.staffId && 
                 requester.staffId.toString() === staffDoc._id.toString();
  
  const isAdminOrOperator = ['ADMINISTRATOR', 'RECORDS_OPERATOR']
                               .includes(requester.accessLevel);
  
  const isAdmin = requester.accessLevel === 'ADMINISTRATOR';

  // Directory tier — everyone always gets this, for any staff member
  const result = {
    _id: staffDoc._id,
    staffId: staffDoc.staffId,
    fullName: staffDoc.fullName,
    role: staffDoc.role,
    roleDisplay: staffDoc.roleDisplay,
    onDuty: staffDoc.onDuty,
    statusDisplay: staffDoc.statusDisplay,
    shiftDisplay: staffDoc.shiftDisplay,
    weeklySchedule: staffDoc.weeklySchedule, // Weekly schedule visible to everyone
    createdAt: staffDoc.createdAt,
    updatedAt: staffDoc.updatedAt
  };

  // Operational tier — Admin/Records Operator for anyone, Clinical Staff only for themselves
  if (isAdminOrOperator || isSelf) {
    result.phoneNumber = staffDoc.phoneNumber;
    result.email = staffDoc.email;
    result.firstName = staffDoc.firstName;
    result.lastName = staffDoc.lastName;
    result.otherNames = staffDoc.otherNames;
  }

  // Sensitive tier — Admin for anyone, Clinical Staff only for themselves
  if (isAdmin || isSelf) {
    result.salary = staffDoc.salary;
    result.bankAccount = staffDoc.bankAccount;
    result.accountNumber = staffDoc.accountNumber;
  }

  return result;
}

module.exports = { serializeStaffForRequester };
