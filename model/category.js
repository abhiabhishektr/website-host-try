const mongoose=require('mongoose')

const category= new mongoose.Schema({

    Name:{
        type:String,
        required:true
    },
    subName:{
        type:String,
        required:true
    },
    Description:{
        type:String,
        required:true
    },
    
       Status: {
        type: Boolean,
        required: true,
        default: true 
    },
    OfferApplied:{
        type:String,
    }


}, { versionKey: false });


const Category= mongoose.model("Categories",category)
Category.collection.dropIndexes(['Name']);

module.exports=Category