const Contact = require('../models/Contacts');
const User = require('../models/User');
const Friendship = require('../models/friendshipSchema')


  

// // Sync contacts (not deleting the existing contacts)
// exports.syncContacts = async (req, res) => {
//   const { contacts } = req.body;
//   const userId = req.user._id; 

//   if (!contacts || !Array.isArray(contacts)) {
//     return res.status(400).json({ error: 'Invalid input: contacts must be an array.' });
//   }

//   try {
//     const contactPromises = contacts.map(async (contact) => {
//       if (!contact.name || !contact.phoneNumber) {
//         throw new Error('Contact must have a name and phone number');
//       }

     
//       const existingContact = await Contact.findOne({
//         user: userId,
//         phoneNumber: contact.phoneNumber
//       });

    
//       if (existingContact) {
//         console.log(`Contact ${contact.name} already exists for this user. Skipping...`);
//         return null; 
//       }

    
//       return new Contact({
//         user: userId,
//         name: contact.name,
//         phoneNumber: contact.phoneNumber,
//         email: contact.email || null
//       }).save();
//     });

  
//     await Promise.all(contactPromises);

//     res.status(200).json({ message: 'Contacts synced successfully!' });
//   } catch (error) {
//     console.error('Error syncing contacts:', error);

//     if (error instanceof mongoose.Error.ValidationError) {
//       return res.status(400).json({ error: 'Validation error: ' + error.message });
//     }

//     if (error.message.includes('Contact must have a name and phone number')) {
//       return res.status(400).json({ error: error.message });
//     }

//     res.status(500).json({ error: 'Failed to sync contacts.' });
//   }
// };


// Sync contacts (deleting the existing contacts)
exports.syncContacts = async (req, res) => {
  const { contacts } = req.body;
  const userId = req.user._id;

  if (!contacts || !Array.isArray(contacts)) {
    return res.status(400).json({ error: 'Invalid input: contacts must be an array.' });
  }

  try {
   
    await Contact.deleteMany({ user: userId });
    console.log(`Existing contacts for user ${userId} deleted.`);

    const contactPromises = contacts.map((contact) => {
      if (!contact.name || !contact.phoneNumber) {
        throw new Error('Contact must have a name and phone number');
      }

     
      return new Contact({
        user: userId,
        name: contact.name,
        phoneNumber: contact.phoneNumber,
        email: contact.email || null,
      }).save();
    });

   
    await Promise.all(contactPromises);

    res.status(200).json({ message: 'Contacts synced successfully!' });
  } catch (error) {
    console.error('Error syncing contacts:', error);

    if (error instanceof mongoose.Error.ValidationError) {
      return res.status(400).json({ error: 'Validation error: ' + error.message });
    }

    if (error.message.includes('Contact must have a name and phone number')) {
      return res.status(400).json({ error: error.message });
    }

    res.status(500).json({ error: 'Failed to sync contacts.' });
  }
};





//this function is working!...
exports.getContacts = async (req, res) => {
  try {
    const userId = req.user._id;
    const contacts = await Contact.find({ user: userId });
    // res.status(200).json(contacts);

    return res.status(200).json({
      message: 'Contacts retrieved successfully.',
      data: contacts
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch contacts.' });
  }
};





exports.searchByNameOrPhoneNumber = async (req, res) => {
  const searchTerm = req.query.search;
  const userId = req.user._id;

  if (!searchTerm) {
    return res.status(400).json({ error: 'Search query parameter (name, username, or phone number) is required.' });
  }

  const normalizePhoneNumber = (phoneNumber) => {
    if (phoneNumber.startsWith('+91')) {
      phoneNumber = phoneNumber.slice(3);
    }
    return phoneNumber.replace(/[^0-9]/g, '');
  };

  try {
    const result = [];
    const normalizedSearchTerm = normalizePhoneNumber(searchTerm);

    // Search in Contacts collection
    const contacts = await Contact.find({
      user: userId,
      $or: [
        { name: { $regex: `^${searchTerm}`, $options: 'i' } },
        { phoneNumber: { $regex: `^${normalizedSearchTerm}`, $options: 'i' } }
      ]
    });

    for (const contact of contacts) {
      const normalizedContactPhone = normalizePhoneNumber(contact.phoneNumber);
      const user = await User.findOne({ phoneNumber: normalizedContactPhone });

      let status = 'contacts';

      if (user) {
        // Check friendship status
        const friendship = await Friendship.findOne({
          $or: [
            { requester: userId, recipient: user._id },
            { requester: user._id, recipient: userId }
          ]
        });

        if (friendship) {
          if (friendship.status === 'blocked') {
            return res.status(403).json({ error: 'User is blocked.' });
          }
          status = friendship.status === 'accepted' ? 'looped' : 'requested';
        } else {
          status = 'devian';
        }

        result.push({
          userId: user._id,
          name: user.name,
          username: user.username,
          profileImg: user.profileImg,
          gender: user.gender,
          dob: user.dob,
          phoneNumber: user.phoneNumber,
          mailAddress: user.mailAddress,
          bio: user.bio,
          link: user.link,
          friendshipStatus: status
        });
      } else {
        result.push({
          name: contact.name,
          phoneNumber: contact.phoneNumber,
          email: contact.email,
          friendshipStatus: 'contacts'
        });
      }
    }

    // Search in Users collection
    const users = await User.find({
      $or: [
        { username: { $regex: `^${searchTerm}`, $options: 'i' } },
        { name: { $regex: `^${searchTerm}`, $options: 'i' } },
        { phoneNumber: { $regex: `^${normalizedSearchTerm}$`, $options: 'i' } }
      ]
    });

    for (const user of users) {
      const isInContacts = result.some(item => item.phoneNumber === user.phoneNumber);

      if (!isInContacts) {
        const friendship = await Friendship.findOne({
          $or: [
            { requester: userId, recipient: user._id },
            { requester: user._id, recipient: userId }
          ]
        });

        let status = 'devian';

        if (friendship) {
          if (friendship.status === 'blocked') {
            return res.status(403).json({ error: 'User is blocked.' });
          }
          status = friendship.status === 'accepted' ? 'looped' : 'requested';
        }

        result.push({
          userId: user._id,
          name: user.name,
          username: user.username,
          profileImg: user.profileImg,
          gender: user.gender,
          dob: user.dob,
          phoneNumber: user.phoneNumber,
          mailAddress: user.mailAddress,
          bio: user.bio,
          link: user.link,
          friendshipStatus: status
        });
      }
    }

    // Filter results by name search
    const filteredResult = result.filter(
      item =>
        item.name.toLowerCase().startsWith(searchTerm.toLowerCase()) ||
        (item.username && item.username.toLowerCase().startsWith(searchTerm.toLowerCase())) ||
        item.phoneNumber === normalizedSearchTerm
    );

    if (filteredResult.length === 0) {
      return res.status(404).json({ message: 'No matching users or contacts found.' });
    }

    return res.status(200).json({
      message: 'Search completed successfully.',
      data: filteredResult
    });
  } catch (error) {
    console.error('Error searching by name, username, or phone number:', error);
    return res.status(500).json({ error: 'Failed to search by name, username, or phone number.' });
  }
};






// // Combined Search by name, username, or phone number
// exports.searchByNameOrPhoneNumber = async (req, res) => {
//   const searchTerm = req.query.search;
//   const userId = req.user._id;

//   if (!searchTerm) {
//     return res.status(400).json({ error: 'Search query parameter (name, username, or phone number) is required.' });
//   }

//   const normalizePhoneNumber = (phoneNumber) => {
//     if (phoneNumber.startsWith('+91')) {
//       phoneNumber = phoneNumber.slice(3);
//     }
//     return phoneNumber.replace(/[^0-9]/g, '');
//   };

//   try {
//     const result = [];
//     const normalizedSearchTerm = normalizePhoneNumber(searchTerm);

//     // Search in Contacts collection
//     const contacts = await Contact.find({
//       user: userId,
//       $or: [
//         { name: { $regex: `^${searchTerm}`, $options: 'i' } },
//         { phoneNumber: { $regex: `^${normalizedSearchTerm}`, $options: 'i' } }
//       ]
//     });

//     for (const contact of contacts) {
//       const normalizedContactPhone = normalizePhoneNumber(contact.phoneNumber);
//       const user = await User.findOne({ phoneNumber: normalizedContactPhone });

//       let status = 'contacts';

//       if (user) {
//         // Check friendship status
//         const friendship = await Friendship.findOne({
//           $or: [
//             { requester: userId, recipient: user._id, status: 'accepted' },
//             { requester: user._id, recipient: userId, status: 'accepted' }
//           ]
//         });

//         status = friendship ? 'looped' : 'devian';

//         result.push({
//           userId: user._id,
//           name: user.name,
//           username: user.username,
//           profileImg: user.profileImg,
//           gender: user.gender,
//           dob: user.dob,
//           phoneNumber: user.phoneNumber,
//           mailAddress: user.mailAddress,
//           bio: user.bio,
//           link: user.link,
//           friendshipStatus: status
//         });
//       } else {
//         result.push({
//           name: contact.name,
//           phoneNumber: contact.phoneNumber,
//           email: contact.email,
//           friendshipStatus: 'contacts'
//         });
//       }
//     }

//     // Search in Users collection
//     const users = await User.find({
//       $or: [
//         { username: { $regex: `^${searchTerm}`, $options: 'i' } },
//         { name: { $regex: `^${searchTerm}`, $options: 'i' } },
//         { phoneNumber: { $regex: `^${normalizedSearchTerm}$`, $options: 'i' } }
//       ]
//     });

//     for (const user of users) {
//       const isInContacts = result.some(item => item.phoneNumber === user.phoneNumber);

//       if (!isInContacts) {
//         const friendship = await Friendship.findOne({
//           $or: [
//             { requester: userId, recipient: user._id, status: 'accepted' },
//             { requester: user._id, recipient: userId, status: 'accepted' }
//           ]
//         });

//         result.push({
//           userId: user._id,
//           name: user.name,
//           username: user.username,
//           profileImg: user.profileImg,
//           gender: user.gender,
//           dob: user.dob,
//           phoneNumber: user.phoneNumber,
//           mailAddress: user.mailAddress,
//           bio: user.bio,
//           link: user.link,
//           friendshipStatus: friendship ? 'looped' : 'devian'
//         });
//       }
//     }

//     // Filter results by name search
//     const filteredResult = result.filter(
//       item =>
//         item.name.toLowerCase().startsWith(searchTerm.toLowerCase()) ||
//         (item.username && item.username.toLowerCase().startsWith(searchTerm.toLowerCase())) ||
//         item.phoneNumber === normalizedSearchTerm
//     );

//     if (filteredResult.length === 0) {
//       return res.status(404).json({ message: 'No matching users or contacts found.' });
//     }

//     return res.status(200).json({
//       message: 'Search completed successfully.',
//       data: filteredResult
//     });
//   } catch (error) {
//     console.error('Error searching by name, username, or phone number:', error);
//     return res.status(500).json({ error: 'Failed to search by name, username, or phone number.' });
//   }
// };
