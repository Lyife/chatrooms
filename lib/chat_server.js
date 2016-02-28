/**
 * Created by Administrator on 2016/2/26.
 */
var socketio = require('socket.io');
var io;
var guestNumber = 1;
var nickNames = {};
var namesUsed = [];
var currentRoom = {};

exports.listen = function(server){


    io = socketio.listen(server);
    io.set('log level',1);
    io.sockets.on('connection',function(socket){
       // console.log('Client connected.');
        guestNumber = assignGuestName(socket,guestNumber,nickNames,namesUsed);
        joinRoom(socket,'Lobby');

        handleMessageBroadcasting(socket,nickNames);
        handleNameChangeAttempts(socket,nickNames,namesUsed);
        handleRoomJoining(socket);

        socket.on('rooms',function(){
            socket.emit('rooms',io.sockets.manager.rooms);
        });

        handleClientDisconnect(socket,nickNames,namesUsed);
    });
};

function assignGuestName(socket,guestNumber,nickNames,nameUsed){
    var name = 'Guest'+ guestNumber;
    nickNames[socket.id] = name;
    socket.emit('nameResult',{
        success:true,
        name:name
    });
    nameUsed.push(name);
    return guestNumber + 1;
}

function joinRoom(socket,room){
    socket.join(room);
    currentRoom[socket.id] = room;
    socket.emit('joinResult',{room:room});
    socket.broadcast.to(room).emit('message',{
        text:nickNames[socket.id]+' has joined ' + room + '.'
    });

    var usersInRoom = io.sockets.clients(room);
    if(usersInRoom.length > 1){
        var usersInRoomSummary = 'Users currently in ' + room +':';
        for(var index in usersInRoom){
            var userSocketId = usersInRoom[index].id;
            if(userSocketId != socket.id){
                if(index > 0){
                    usersInRoomSummary += ','
                }
                usersInRoomSummary += nickNames[userSocketId];
            }
        }
        usersInRoomSummary +='.'
        socket.emit('message',{text:usersInRoomSummary});
    }
}

function handleNameChangeAttempts(socket,nickNames,nameUsed){
    socket.on('nameAttempt',function(name){
        if(name.indexOf('Guest') == 0){
            socket.emit('nameResult',{
                success:false,
                message:'Names cannot begin with "GUEST".'
            });
        }else{
            if(namesUsed.indexOf[name] == -1){
                var previousName = nickNames[socket.id];
                var previousNameIndex  = nameUsed.indexOf(previousName);
                nameUsed.push(name);
                nickNames[socked.id] = name;
                delete nameUsed[previousNameIndex];
                socket.emit('nameResult',{
                    success:true,
                    name:name
                });
                socket.broadcast.to(currentRoom[socket.id]).emit('message',{
                    text:previousName + 'is now knows as ' + name + '.'
                })
            }else{
                socket.emit('nameResult',{
                    success:false,
                    message:'That name is already in use.'
                })
            }
        }
    })
}

function handleMessageBroadcasting(socket){
    socket.on('message',function(message){
        socket.broadcast.to(message.root).emit('message',{
            text:nickNames[socket.id] + ':' + message.text
        });
    });
}

function handleRoomJoining(socket){
    socket.on('join',function(room){
        socket.leave(currentRoom[socket.id]);
        joinRoom(socket,room.newRoom);
    })
}

function handleClientDisconnect(socket){
    socket.on('disconnet',function(){
        var nameIndex = namesUsed.indexOf(nickNames[socket.id]);
        delete nameUsed[nameIndex];
        delete nickNames[socket.id];
    });
}

