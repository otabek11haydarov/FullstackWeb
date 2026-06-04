const { Patient, Doctor } = require('./src/models');

async function fixPatients() {
  try {
    console.log('Fetching doctors...');
    const doctors = await Doctor.findAll();
    
    if (doctors.length === 0) {
      console.log('No doctors found in the database. Please create a doctor first!');
      process.exit(1);
    }

    const firstDoctor = doctors[0];
    console.log(`Found doctor: ${firstDoctor.id}. Updating unassigned patients...`);

    const [updatedCount] = await Patient.update(
      { doctorId: firstDoctor.id },
      { where: { doctorId: null } }
    );

    console.log(`✅ Successfully assigned ${updatedCount} previously unassigned patients to Doctor ID: ${firstDoctor.id}.`);
    process.exit(0);
  } catch (error) {
    console.error('Error updating patients:', error);
    process.exit(1);
  }
}

fixPatients();
