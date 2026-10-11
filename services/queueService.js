const Appointment = require('../models/appointment');

const callNextPatient = async (doctorId, appointmentDate) => {
    return Appointment.findOneAndUpdate(
        {
            doctorId,
            appointmentDate,
            status: { $in: ['booked', 'waiting'] }
        },
        {
            $set: { status: 'called' }
        },
        {
            sort: { tokenNumber: 1 },
            new: true,
            runValidators: true
        }
    );
};

module.exports = { callNextPatient };



// Ye code kya karega?

// Sirf specified doctor aur date ki appointments search karega.

// booked ya waiting status wale patients mein sabse chhota token number select karega.

// Ek atomic database operation mein us appointment ka status called karega.

// Koi eligible patient nahi mila toh null return karega.

// findOneAndUpdate() ka fayda ye hai ki patient select aur update ek hi database operation mein hota hai. 
// Isse concurrent requests mein wahi patient baar-baar select hone ka risk kam hota hai.
//  Lekin production-grade queue ke liye retry/concurrency behavior bhi verify karna hoga.