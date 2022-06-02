//------------------------------------------------------------pathfinder

// grid, graph, directed_graph, RRP

class GridPathFinder{

	static get action_buffer(){return 5}

	static unpack_action(action){
		let command = (action >> 2) & ((1 << myUI.planner.static_bit_len) - 1);
		if(action & 1)  // dest exists
			var dest = (action >> 2 + myUI.planner.static_bit_len) & ((1 << myUI.planner.static_bit_len) - 1);
		if(action & (1<<1)){  // coord exists
			var coord = (action >> 2 + myUI.planner.static_bit_len * 2) & ((1 << myUI.planner.coord_bit_len) - 1);
			var y = Math.floor(coord/myUI.planner.map_width);
			var x = coord - y * myUI.planner.map_width;
    }
		return [command, dest, y, x];
	}

	static pack_step(step_cache){
		let buffer = GridPathFinder.action_buffer;
		let length = buffer * step_cache.length;
		let bit_lengths = new Uint8Array(step_cache.length);
		for(let i=0;i<step_cache.length;++i){
			let action = step_cache[i];
			bit_lengths[i] = Math.ceil(Math.log2(action+1));
			length += Math.ceil(Math.log2(action+1));
		}
		//console.log(length);
		let res = new Uint8Array(Math.ceil(length/8));
		let start = 0;
		for(let i=0;i<step_cache.length;++i){
			BitArray.set_range(res, start, bit_lengths[i]);
			start+=buffer;
			BitArray.set_range(res, start, step_cache[i]);
			start+=bit_lengths[i];
		}
		return res;
	}

	static unpack_step(step){
		let curr = 0;
		let steps_unpacked = [];
		while(curr<step.length){
			let action_len = BitArray.get_range(step, curr, GridPathFinder.action_buffer);
			curr+=GridPathFinder.action_buffer;
			steps_unpacked.push(BitArray.get_range(step, curr, action_len));
			curr+=action_len;
		}
		return steps_unpacked;
	}

	constructor(num_neighbours = 8, diagonal_allow = true, first_neighbour = "N", search_direction = "anticlockwise"){
		this.num_neighbours = num_neighbours;
		this.diagonal_allow = diagonal_allow;
		this.first_neighbour = first_neighbour;
		this.search_direction = search_direction;

		if(this.num_neighbours==8){
			var delta = [[-1, 0], [-1, -1], [0, -1], [1, -1], [1, 0], [1, 1], [0, 1], [-1, 1]];
			var deltaNWSE = ["N", "NW", "W", "SW", "S", "SE", "E", "NE"];
		}
		else{ // if(this.num_neighbours==4)
			var delta = [[-1, 0], [0, -1], [1, 0], [0, 1]];
			var deltaNWSE = ["N", "W", "S", "E"];
		}
		if (this.search_direction=="clockwise"){
			delta.reverse();
			deltaNWSE.reverse();
		}
		
		this.first_index = deltaNWSE.indexOf(this.first_neighbour);
		this.deltaNWSE = deltaNWSE.slice(this.first_index).concat(deltaNWSE.slice(0, this.first_index));
		this.delta = delta.slice(this.first_index).concat(delta.slice(0, this.first_index));

    this.searched = false;
	}

	add_map(map){
		this.map = map; // 2d array; each 1d array is a row
		this.map_height = map.length;
		this.map_width = map[0].length;
		this.coord_bit_len = Math.ceil(Math.log2((this.map_height-1) * (this.map_width-1)));
		this.static_bit_len = Math.ceil(Math.log2(STATIC.max_val+1));
	}

	_init_search(start, goal){
    this.start = start; //in array form [y,x]  [0,0] is top left  [512,512] is bottom right
    this.goal = goal;
    this.queue = [];  // BFS uses a FIFO queue to order the sequence in which nodes are visited
    this.neighbours = [];  // current cell's neighbours; only contains passable cells
    this.path = null;
    this._clear_steps();
    this.requires_uint16 = this.map_height > 255 || this.map_width > 255;
    this.draw_arrows = this.map_height <= +4 || this.map_width <= 128;
    this.states_nums = new Set(); // stores the unique ids of each state// only used for DB
    this.states = {};
    this.states_arr = [];

    // generate empty 2d array
    this.queue_matrix = zero2D(this.map_height, this.map_width); // initialise a matrix of 0s (zeroes), height x width
    this.visited = new BitMatrix(this.map_height, this.map_width);
    this.searched = false;
    this._create_cell_index();

    this.step_index = -1;
    this.prev_count = -1;
    this.state_counter = 0;
    if(this.draw_arrows) this.arrow_step = -1;
    // step_index is used to count the number of times a step is created
    // at every ~100 steps, a state is saved
    // this balances between processer and memory usage
	}

	_clear_steps(){
		this.steps_forward = [];
		this.steps_inverse = [];
	}

	_create_step(){
		this.step_cache = [];
	}

	_create_action(){
		/* use bitmasking to compress every action into a series of Uint8 numbers */
		/* bits are read from right ot left */
		// rightmost bit shows if action contains destination
		// 2nd rightmost shows if action contains coordinates
		// next this.static_bit_len bits contains the command
		// next this.static_bit_len bits contains the destination, if applicable
		// next coord_bit_len bits contains the coordinates
		this.action_cache = 0;
		this.action_cache += arguments[0] << 2; // command 
		if(arguments[1]!==undefined){
			this.action_cache += 1; // dest_exists
			this.action_cache += arguments[1] << (2 + this.static_bit_len); // dest
		}
		if (arguments[2]!==undefined){
			this.action_cache += 1<<1; // coords exists?
			let y = arguments[2][0];
			let x = arguments[2][1];
			this.action_cache += (y * this.map_width + x) << (2 + this.static_bit_len * 2);
		}
		this.step_cache.push(this.action_cache);
	}

	_save_step(step_direction="fwd"){
		var step = this.step_cache;
		/* THIS PART IS A BETA TEST FOR MORE EFFICIENT STORING OF STEPS */
		/* 
			Each step will consist of (5 buffer bits determining how long the action is + action itself) * number of actions
		*/
		if(myUI.step_new){
			step = GridPathFinder.pack_step(this.step_cache);
		}
		/* END TEST */
		if(myUI.db_step){
			step.unshift(this.step_index);
			if(step_direction=="fwd") myUI.storage.add("step_fwd", [step]);
			else myUI.storage.add("step_bck", [step]);
		}
		else{
			if(!this.step_index_map) this.step_index_map = [];
			if(step_direction=="fwd") this.step_index_map.push(this.steps_forward.length);
			/* 
			step 0 is index 0
			step 1 is kth index where step 0 is k-items long
			step n is k0+k1+k2+...k(n-1) = k(0 to n-1)th index
			*/
			if(step_direction=="fwd") step.forEach(action=>this.steps_forward.push(action));
			else step.forEach(action=>this.steps_inverse.push(action));
		}
		if(step_direction=="bck") ++this.step_index;
	}

	_create_cell_index(){
		this.cell_map = zero2D(this.map_height, this.map_width, Number.MAX_SAFE_INTEGER);
	}

	_assign_cell_index(yx){
		// index is the step index for the first expansion of that cell
		let [y,x] = yx;
		this.cell_map[y][x] = this.step_index;
	}

	get_step(num, step_direction="fwd"){
		let stepPromise;
		if(myUI.db_step){
			stepPromise = step_direction=="fwd" ? myUI.storage.get("step_fwd", num) : myUI.storage.get("step_bck", num+1);
		}
		else{
			if(step_direction!="fwd") ++num; // num has to be incremented for reverse steps;
			let index = this.step_index_map[num];
			let nx_index = this.step_index_map[num+1];
			console.log(num);
			console.log(index);
			console.log(nx_index);
			let step = step_direction=="fwd" ? this.steps_forward.slice(index, nx_index) :this.steps_inverse.slice(index, nx_index);
			stepPromise = new Promise((resolve, reject)=>{
				resolve(step);
			})
		}
		return stepPromise;
	}

	final_state() {
    if (!this.start) return alert("haven't computed!");
    return { path: this.path, queue: this.queue, visited: this.visited.copy_data(), arrow_step: this.arrow_step};
  }

  max_step(){
    return this.step_index-1 ; // because of dummy step at the end and final step is n-1
  }

  all_states() {
    if (this.searched) return myUI.db_on ? this.states_nums : this.states;
    return null;
  }
}

class Node{
	constructor(f_cost, g_cost, h_cost, parent, self_YX){
	  	this.f_cost = f_cost;
      this.g_cost = g_cost;
      this.h_cost = h_cost;
		  this.parent = parent;
		  this.self_YX = self_YX[0]>255 || self_YX[1]>255 ? new Uint16Array(self_YX) : new Uint8Array(self_YX);
	}
}

class BitArray{

	static set_range(array, start_bit, val){
		// val>0
		let length = Math.ceil(Math.log2(val+1));
		let arr_index = start_bit>>3;
		let pos = start_bit&0b111;
		let mask = 0b11111111 ^ (((1<<length)-1)<<pos);
		let chunk_length = length+pos > 8 ? 8-pos : length;
		array[arr_index] = (array[arr_index] & mask)+ (val << pos);
		//console.log(val, pos, mask.toString(2), chunk_length);
		length -= chunk_length;
		val >>= chunk_length;
		++arr_index;
		while(length>=8){
			array[arr_index] = val & 255;
			length -= 8;
			val >>= 8;
			++arr_index;
		}
		if(length){
			let mask = 0b11111111 ^ ((1<<length)-1);
			array[arr_index] = (array[arr_index] & mask) + val;
		}
		//console.log(array);
	}

	static get_range(array, start_bit, length){
		let val = 0;
		let completed_length = 0;
		let arr_index = start_bit>>3;
		let pos = start_bit&0b111;
		let mask = (((1<<length)-1)<<pos);
		let data = (array[arr_index] & mask) >> pos;
		let chunk_length = length+pos > 8 ? 8-pos : length;
		val += data;
		length -= chunk_length;
		completed_length += chunk_length;
		++arr_index;
		while(length>=8){
			val += array[arr_index] << completed_length;
			length -= 8;
			completed_length += 8;
			++arr_index;
		}
		if(length){
			let mask = (1<<length)-1;
			val += (array[arr_index] & mask) << completed_length;
		}
		return val;
	}
}

class BitMatrix{

	// THIS IS A CUSTOM CLASS THAT USES THE UINT8 ARRAYS TO MORE EFFICIENTLY STORE 2D BIT ARRAYS

	static compress_bit_matrix(bit_matrix){
		let num = Math.ceil(bit_matrix[0].length/8);
		let last_denary = bit_matrix[0].length % 8;
		let res = new Uint8Array(2+num*bit_matrix.length);
		res[0] = num;
		res[1] = last_denary;
		let j = 2;
		bit_matrix.forEach(row=>{
			let index = 0;
			while(index<row.length){
				let args = row.slice(index, index+8); // take 8 bits or remaining bits because already calculated
				var digit = parseInt(args.join(""), 2);
				index += 8;
				res[j] = digit;
				++j;
			}
		});
		return res;
	}

	static expand_2_matrix(arr){
		const num = arr[0];
		const last_denary = arr[1];
		const num_rows = (arr.length-2)/num;
		const num_cols = (num-1)*8+last_denary;
		
		let res = zero2D(num_rows, num_cols);
		for(let i=0;i<num_rows;++i){
			let j = 0;
			let row = arr.slice(i*num+2, (i+1)*num+2);
			for(let k=0;k<row.length;++k){
				let bin_str = row[k].toString(2);
				let num_zeros = k==row.length-1 ? last_denary-bin_str.length : 8-bin_str.length;
				bin_str = "0".repeat(num_zeros) + bin_str;
				bin_str.split('').forEach(bit=>{
					res[i][j] = parseInt(bit);
					++j;
				});
			}
		}
		return res;
	}

	constructor(num_rows, num_cols){
		let num = Math.ceil(num_cols/8);
		let last_denary = num_cols % 8 == 0 ? 8 : num_cols % 8;
		this.data = new Uint8Array(2+num*num_rows);
		this.data[0] = num;
		this.data[1] = last_denary;
		this.num_rows = num_rows;
		this.num_cols = num_cols;
		this.num = num;
		this.last_denary = last_denary;
	}


	set_data(yx, new_data){
		let index = 2 + yx[0]*this.num + (yx[1]>>3); // same as Math.floor(yx[1]/8);
		if(index==0){
			console.log("bruh");
			console.log(yx);
		}
		let bin_length = (index-1) % this.num == 0 ? this.last_denary : 8;
		let rem = yx[1]%8;
		let data_shifted = new_data << (bin_length - rem - 1);
		let mask = 0b11111111 ^ (1 << (bin_length - rem - 1));
		this.data[index] = (this.data[index] & mask) + data_shifted;

	}

	get_data(yx){
		let index = 2 + yx[0]*this.num + (yx[1]>>3); // same as Math.floor(yx[1]/8);
		let bin_length = (index-1) % this.num == 0 ? this.last_denary : 8;
		let rem = yx[1]%8;
		let mask = 1 << (bin_length - rem - 1);
		return this.data[index] & mask ? 1 : 0;
	}

	copy_data(){
		return new Uint8Array(this.data);
	}

	copy_2d(){
		return BitMatrix.expand_2_matrix(this.data);
	}
}
