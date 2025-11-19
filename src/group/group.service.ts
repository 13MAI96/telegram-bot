import { ForbiddenException, HttpException, HttpStatus, Injectable, NotFoundException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import { Group } from "../schemas/group.schema";
import { CreateGroupDto } from "./dto/create-group.dto";


@Injectable()
export class GroupService{
    constructor(
        @InjectModel(Group.name) private groupModel: Model<Group>,
    ) {}
  
    async create(createUserDto: CreateGroupDto): Promise<Group> {
        if(createUserDto._id){
            const user = await this.groupModel.findById(createUserDto._id).exec();
            if(user) return user;
        }
        const createdUser = new this.groupModel(createUserDto);
        return createdUser.save();
    }

    async update(id: Types.ObjectId, updateGroupDto: CreateGroupDto){
        if(updateGroupDto._id){
            const updatedGroup = await this.groupModel.findByIdAndUpdate(
                id,
                {$set: updateGroupDto},
                {new: true}
            )
            if(!updatedGroup){
                throw new NotFoundException(`User not found`)
            }
            return updatedGroup
        }
    }

    async findOne(id: string): Promise<Group | null>{
        return this.groupModel.findById(id).exec();
    }

    async findByAdmin(id: string): Promise<Group | null>{
        return this.groupModel.findOne({admin: id}).exec();
    }

    async hasAssignedGroup(user: string): Promise<Group | null>{
        return this.groupModel.findOne({ "users.id": user}).exec()
    }

}



