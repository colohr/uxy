
const fxy = require('fxy')
const replace = require('lodash.replace')

const delimiters = [`"`,`'`]
const replaces = {
	"@import":{},
	"href=":{},
	"src":{}
}

class UXY{
	constructor(directory,options){
		if(fxy.is.data(options)) Object.assign(this,options)
		this.original = directory.split('/').map(part=>part.trim()).filter(part=>part.length > 0).join('/')
		this.output = fxy.join('/',this.original+'_uxy','/')
		this.original = fxy.join('/',this.original,'/')
	}
	get valid(){
		if(!fxy.is.text(this.host)) {
			console.error('set a hostname in the options object')
			return false
		}
		if(!fxy.is.array(this.targets)) {
			console.error('set a target array in the options object')
			return false
		}

		if(fxy.exists(this.original) && fxy.is.folder(this.original)){
			return true
			if(!fxy.exists(this.output)){
				return true
			}
			else console.error(new Error(`${this.output} already exists. delete first`))
		}
		else console.error(new Error(`${this.original} is not a folder`))
		return false
	}
}

module.exports = function uxy_export(directory,options){
	return new Promise((success,error)=>{
		let uxy = new UXY(directory,options)
		if(!uxy.valid) return error(new Error(`Could not replace values`))
		return start(uxy).then(success).catch(error)
	})
}


function start(uxy){
	let reps = regs(uxy.targets)
	return fxy.copy_dir(uxy.original,uxy.output).then(copier=>{
		let files = get_files(uxy.output,uxy.skip)
		if(fix_files(files,uxy.host,reps)){
			return true
		}
		throw new Error('error when fixing file contents')
	})
}

function get_files(directory,skips){
	if(!fxy.is.array(skips)) skips = []
	return fxy.tree(directory,'js','es6','html','css').items.only.filter(item=>{
		let skip = skips.filter(path=>item.get('path').includes(path)).length > 0
		if(skip) return false
		return true
	})
}

function regs(targets){
	let list = []
	for(let delimiter of delimiters){
		for(let target of targets){
			let rep = new RegExp(`${delimiter}${target}`,'g')
			list.push({reg:rep,target,delimiter})
		}
	}
	return list
}

function fix_files(files,host,list){
	for(let file of files){
		let res = fix_file(file,host,list)
		if(res === false) return false
	}
	return true
}
function fix_file(file,host,list){
	let content = file.content
	let count = content.length
	content = replace_content(content,host,list)
	if(content.length === count) return console.log(file.name,'not changed')
	let filepath = file.get('path')
	try{
		fxy.writeFileSync(filepath,content)
		console.log('updated file',file.name)
		return true
	}catch(e){
		console.error(e)
	}
	return false
	
}
function replace_content(content,host,list){
	for(let rep of list){
		content = replace_in(content,host,rep)
	}
	return content
}
function replace_in(content,host,{reg,delimiter,target}){
	if(content.search(reg) >= 0){
		//console.log('before: ',b)
		let protocol = get_protocol(host)
		if(protocol) host = host.replace(protocol,'')
		let rep = fxy.join(`${host}`,target)
		if(protocol) rep = `${delimiter}${protocol}${rep}`
		else rep = `${delimiter}${rep}`
		content = content.replace(reg,rep)
	}
	return content
}

function get_protocol(host){
	if(host.includes('https://')){
		return 'https://'
	}
	else if(host.includes('http://')){
		return 'http://'
	}
	return false
	
}