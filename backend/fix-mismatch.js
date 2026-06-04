const { Patient, Diagnosis, Doctor } = require('./src/models');

async function checkMismatch() {
  const diagnoses = await Diagnosis.findAll({ include: [Patient] });
  let mismatchCount = 0;
  for (const diag of diagnoses) {
    if (diag.Patient && diag.Patient.doctorId !== diag.doctorId) {
      console.log(`Mismatch! Diagnosis ${diag.id} belongs to Doctor ${diag.doctorId}, but Patient ${diag.Patient.id} belongs to Doctor ${diag.Patient.doctorId}`);
      mismatchCount++;
      // Fix it by updating the Patient to belong to the Diagnosis doctor!
      await diag.Patient.update({ doctorId: diag.doctorId });
    }
  }
  console.log(`Found and fixed ${mismatchCount} mismatches.`);
  process.exit(0);
}

checkMismatch();
