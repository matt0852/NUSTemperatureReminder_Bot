require('dotenv').config()

const express = require('express')
const app = express()
app.use(express.urlencoded({ extended: true }))
app.use(express.json())

const axios = require('axios')

const schedule = require('node-schedule')

const mongoose = require('mongoose')
mongoose.connect(process.env.MONGODB_CONNECTION_STRING,
    { authSource: 'admin', useNewUrlParser: true, useUnifiedTopology: true, useFindAndModify: false },
    (err) => {
        if (err) console.log(err)
        else console.log('Connected to mongodb')
    })

const userSchema = new mongoose.Schema({
    firstName: String,
    lastName: String,
    username: String,
    chatId: Number,
    link: String,
    timings: [String],
    changeLinksMode: Boolean,
    changeTimingsMode: Boolean
})

const userModel = mongoose.model('User', userSchema)

const bot = '@NUSTemperatureReminder_Bot'
const url = 'https://api.telegram.org/bot' + process.env.TOKEN
const defaultLink = 'https://myaces.nus.edu.sg/htd/htd'

// db methods

findUser = async (chatId) => {
    const user = await userModel.findOne({ chatId: chatId })
    return user
}

createNewUser = async (message) => {
    const user = new userModel({
        firstName: message.firstName,
        lastName: message.lastName,
        username: message.username,
        chatId: message.chatId,
        link: defaultLink,
        timings: ['0800', '1300'],
        changeLinksMode: false,
        changeTimingsMode: false
    })
    await user.save()
}

updateChangeLinksMode = async (chatId, changeLinksMode) => {
    const user = await userModel.findOneAndUpdate({ chatId: chatId }, { changeLinksMode: changeLinksMode }, { new: true })
    return user
}

changeUserLinks = async (message) => {
    const user = await userModel.findOneAndUpdate({ chatId: message.chatId }, { link: message.text }, { new: true })
    return user
}

updateChangeTimingsMode = async (chatId, changeTimingsMode) => {
    const user = await userModel.findOneAndUpdate({ chatId: chatId }, { changeTimingsMode: changeTimingsMode }, { new: true })
    return user
}

changeTimings = async (message) => {
    const timings = message.text.split(',')
    for (let i = 0; i < timings.length; i++) {
        const time = timings[i]
        if (time.length != 4) {
            console.log('Not 4')
            return
        }
        if (Number(time) == NaN) {
            console.log('Not number')
            return
        }
    }
    const user = await userModel.findOneAndUpdate({ chatId: message.chatId }, { timings: timings }, { new: true })
    return user
}

deleteUser = async (chatId) => {
    await userModel.findOneAndDelete({ chatId: chatId })
}

// message methods

getTextMessage = (req) => {
    try {
        if (req.body.message.text && req.body.message.chat.id) {
            const message = {
                firstName: req.body.message.from.first_name,
                lastName: req.body.message.from.last_name,
                username: req.body.message.from.username,
                text: req.body.message.text,
                chatId: req.body.message.chat.id
            }
            return message
        }
        else return null
    }
    catch {
        return null
    }
}

sendMessage = async (chatId, text) => {
    const res = await axios.get(url + '/sendMessage', {
        params: {
            chat_id: chatId,
            text: text
        }
    })
    return res.status
}

sendReminderMessage = async (user) => {
    const text = 'Remember to take your temperature! \n' + user.link
    await sendMessage(user.chatId, text)
}

sendTestMessage = async (chatId) => {
    const user = await findUser(chatId)
    await sendReminderMessage(user)
}

sendReminders = async () => {
    const date_ob = new Date()
    const hours = ('0' + date_ob.getHours()).slice(-2);
    const minutes = ('0' + date_ob.getMinutes()).slice(-2);
    const currentTime = hours + minutes
    const users = await userModel.find()
    for (const user of users) {
        try {
            const timings = user.timings
            for (const time of timings) {
                if (time == currentTime) {
                    await sendReminderMessage(user)
                    console.log('Reminder sent to: ' + user.chatId + ' at time ' + currentTime)
                }
            }
        }
        catch {
            await deleteUser(user.chatId)
            console.log('User deleted: ' + user.chatId)
        }
    }
}

manageMessage = async (req, res) => {
    const message = await getTextMessage(req)
    if (message) {
        // find the user who sent the message, if any
        const user = await findUser(message.chatId)

        // if the user exists, check if the user is currently changing the links
        if (user) {
            if (user.changeLinksMode == true) {
                await updateChangeLinksMode(message.chatId, false)
                await changeUserLinks(message)
                await sendMessage(message.chatId, 'Your link(s) have been updated.')
            }
            if (user.changeTimingsMode == true) {
                await updateChangeTimingsMode(message.chatId, false)
                const user = await changeTimings(message)
                if (user) await sendMessage(message.chatId, 'Your timings have been updated.')
                else await sendMessage(message.chatId, 'Error - wrong formatting. Try again with /timing.')
            }
        }

        // otherwise, make a new user
        else {
            await createNewUser(message)
        }

        // user commands
        if (message.text == '/start' || message.text == '/start' + bot) {
            await sendMessage(message.chatId, 'Hi there! This is the NUS Temperature Reminder Bot.\
            \nYour temperature taking link(s) will be sent at 8am and 1pm daily.\
            \n\
            \nUse /change to change the links that the bot will send.\
            \nUse /test to send a sample reminder message.\
            \nUse /bug to report any bugs.\
            \nUse /github to view the source code.\
            \n\
            \nTo view this message again, use /start')
        }

        else if (message.text == '/change' || message.text == '/change' + bot) {
            await updateChangeLinksMode(message.chatId, true)
            await sendMessage(message.chatId, 'Please send your new link(s):')
        }

        else if (message.text == '/test' || message.text == '/test' + bot) {
            await sendTestMessage(message.chatId)
        }

        else if (message.text == '/timing' || message.text == '/timing' + bot) {
            await updateChangeTimingsMode(message.chatId, true)
            await sendMessage(message.chatId, 'Please send two new timings in the format HHMM,HHMM\nFor instance, 0800,1300')
        }

        else if (message.text == '/github' || message.text == '/github' + bot) {
            await sendMessage(message.chatId, 'Check out the source code here: \
            https://github.com/matt0852/NUSTemperatureReminder_Bot')
        }

        else if (message.text == '/bug' || message.text == '/bug' + bot) {
            await sendMessage(message.chatId, 'Report a bug to my Telegram handle: @matt0852')
        }
    }
    res.sendStatus(200)
}

// scheduler methods

const everyMinJob = schedule.scheduleJob('*/1 * * * *', () => {
    sendReminders()
})

// express routes

app.get('/', (req, res) => {
    res.send('NUS Temperature Reminder Bot. Find it at http://t.me/NUSTemperatureReminder_Bot')
})

app.post('/' + process.env.TOKEN, (req, res) => {
    manageMessage(req, res)
})

app.listen(process.env.PORT, () => {
    console.log('Server started')
})