require('dotenv').config()

const express = require('express')
const app = express()
app.use(express.urlencoded({ extended: true }))
app.use(express.json())

const axios = require('axios')
const { response } = require('express')

const url = 'https://api.telegram.org/bot' + process.env.TOKEN

getTextMessage = (req) => {
    if (req.body.message.text && req.body.message.chat.id) {
        let message = {
            text: req.body.message.text,
            chat_id: req.body.message.chat.id
        }
        return message
    }
    else return Error('Bad text message')
}

sendMessage = async (message) => {
    await axios.get(url + '/sendMessage', {
        params: {
            chat_id: message.chat_id,
            text: message.text
        }
    })
}

echoMessage = (req, res) => {
    getTextMessage(req, (error, message) => {
        if (error) {
            console.log(error)
            res.sendStatus(200)
        }
        else {
            sendMessage(message).then(() => {
                res.sendStatus(200)
            })
        }
    })
}

app.get('/', (req, res) => {
    res.send('NUS Temperature Reminder Bot, webhook added')
})

app.post('/' + process.env.TOKEN, (req, res) => {
    echoMessage(req, res)
})

app.listen(process.env.PORT, () => {
    console.log('Server started')
})