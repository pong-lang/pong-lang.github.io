class Decompiler
{
    constructor(bytes)
    {
        this.output = "";
        this.bytes = bytes;
        this.index = 0;
    }

    BytesToUShort(lsb, msb)
    {
        return lsb + (msb << 8)
    }

    ReadUShort()
    {
        let lsb = this.ReadByte();
        let msb = this.ReadByte();
        return this.BytesToUShort(lsb, msb);
    }

    ReadByte()
    {
        return this.bytes[this.index++];
    }

    WriteType(typeId)
    {
        switch (typeId)
        {
            case 0x00:
                this.WriteTypeWithColour("u8");
                break;
            case 0x01:
                this.WriteTypeWithColour("u16");
                break;
            case 0x02:
                this.WriteTypeWithColour("i16");
                break;
            case 0x03:
                this.WriteTypeWithColour("void");
                break;
            default:
                return "UNKNOWN TYPE";
        }
    }

    WriteAsHex(value, chars = 4)
    {
        this.output += `<span class="style_hex">$${value.toString(16).toUpperCase().padStart(chars, '0')}</span>`;
    }

    WriteKeyword(keyword)
    {
        this.output += `<span class="style_keyword">${keyword}</span>\t`;
    }

    WriteTypeWithColour(type)
    {
        this.output += `<span class="style_type">${type}</span>`;
    }
    
    ProcessOffsetOperand(type, data)
    {
        switch (type)
        {
            case 0x00:
                this.WriteAsHex(data);
                break;
            case 0x01:
                this.WriteVarName(data);
                break;
            case 0x02:
                this.output += "<span class=\"style_addr\">";
                this.output += '&';
                this.WriteVarName(data);
                this.output += "</span>";
                break;
            default:
                this.output += "UNKNOWN_DATA";
                break;
        }
    }

    ProcessOffset()
    {
        this.output += "[";

        //Read all the data we need before we write it
        let lhType = this.ReadByte();
        let lhData = this.ReadUShort();
        let op = this.ReadByte();
        let rhType = this.ReadByte();
        let rhData = this.ReadUShort();

        this.ProcessOffsetOperand(lhType, lhData);

        if (op === 0)
            this.output += '-';
        else
            this.output += '+';

        this.ProcessOffsetOperand(rhType, rhData);

        this.output += "]";
    }

    WriteVarName(varId)
    {
        this.output += "VAR_" + varId.toString(16).toUpperCase().padStart(4, '0');
    }
    
    ProcessInstruction(opcode, addr)
    {
        this.output += `<span class="no_select"><span class="style_hex">$${addr.toString(16).toUpperCase().padStart(4, '0')}</span>\t`;
        this.output += `<span class="style_hex">$${opcode.toString(16).toUpperCase().padStart(4, '0')}</span>\t</span>`;

        switch (opcode)
        {
            case 0x0000:
            {
                this.WriteKeyword("nop");
                break;
            }
            case 0x0001:
            {
                this.WriteKeyword("ret");
                break;
            }
            case 0x0002:
            {
                this.WriteKeyword("halt");
                break;
            }
            case 0x0500:
            {
                this.WriteKeyword("vnew");
                let varId = this.ReadUShort();
                this.WriteVarName(varId);
                this.output += ", ";

                let varType = this.ReadByte();
                this.WriteType(varType);

                break;
            }
            case 0x0900:
            {
                this.WriteKeyword("alloc");
                let varId = this.ReadUShort();
                this.WriteVarName(varId);
                this.output += ", ";

                let blockSize = this.ReadUShort();
                this.WriteAsHex(blockSize);
                break;
            }

            case 0x1000:
            {
                this.WriteKeyword("str");
                let varId = this.ReadUShort();
                this.WriteVarName(varId);
                this.output += ", ";
                
                let byte = this.ReadUShort();
                this.WriteAsHex(byte);
                
                break;
            }
            
            case 0x1106:
            {
                this.WriteKeyword("mov");
                let varId = this.ReadUShort();
                this.WriteVarName(varId);
                this.output += ", ";
                
                this.ProcessOffset();
                
                break;
            }

            case 0x1121:
            {
                this.WriteKeyword("mov");
                this.ProcessOffset();
                this.output += ", ";

                let data = this.ReadUShort();
                this.WriteAsHex(data);

                break;
            }
            
            case 0x1126:
            {
                this.WriteKeyword("mov");
                this.ProcessOffset();
                this.output += ", ";
                this.ProcessOffset();
                break;
            }
            
            case 0x1500:
            {
                this.WriteKeyword("goto");
                this.WriteAsHex(this.ReadUShort());
                break;
            }

            case 0x1510:
            {
                this.WriteKeyword("call");
                this.WriteAsHex(this.ReadUShort());
                break;
            }
            
            case 0xFFF0:
            {
                this.WriteKeyword("drop");
                let varId = this.ReadUShort();
                this.WriteVarName(varId);
                break;
            }

            case 0xFFF1:
            {
                this.WriteKeyword("free");
                let varId = this.ReadUShort();
                this.WriteVarName(varId);
                break;
            }

            case 0xFFF2:
            {
                this.WriteKeyword("free");
                let varId = this.ReadUShort();
                this.WriteVarName(varId);
                
                this.output += ', ';
                let blockSize = this.ReadUShort();
                this.WriteAsHex(blockSize);
                
                break;
            }

            case 0xFFF3:
            {
                this.WriteKeyword("free");
                this.ProcessOffset();

                this.output += ', ';
                let blockSize = this.ReadUShort();
                this.WriteAsHex(blockSize);

                break;
            }
            
            default:
            {
                this.output += "unknown";
                break;
            }
        }

        this.output += '<br/>';
    }

    Decompile()
    {
        if (this.bytes.length >= 65355)
        {
            this.output = `<h2><span class='style_error'>Error</span></h2> ROM size exceeded 16-bit integer limit.<span class=\"small\"> (Got ${this.bytes.length} bytes)</span>`;
        }
        else
        {
            while (this.index < this.bytes.length)
            {
                let addr = this.index;
                let opcode = this.ReadUShort();

                this.ProcessInstruction(opcode, addr);
            }

            this.output =
                "<pre><h2>Displaying Disassembly</h2><div class=\"DisassemblyBox\">" +
                "<span class='no_select'>Addr\tOp\tDisassembled</span><hr>" +
                this.output +
                "</div></pre>";
        }

        document.getElementById("output").innerHTML = this.output;
    }
}