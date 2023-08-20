<script>
    import Jaro, { bigSort } from './Jaro.svelte';
    let newText;
    let exportText;
    let selected_l;
    let mapped_l_keys = [];
    let mapped_r_keys = [];
    let unmapped_l_keys = [];
    let unmapped_r_keys = [];
    let data_l = {};
    let data_r = {};
    // let unmapped_l_keys = [0, 1, 2, 3, 4];
    // let unmapped_r_keys = [0, 1, 2, 3, 4];
    // let data_l = {0:"Member ID",1:"SSN",2:"Revenue",3:"Code",4:"Quantity"};
    // let data_r = {0:"Service NPI", 1:"Member Num", 2:"Claim Num", 3:"Drug Code", 4:"Drug Quantity"};

    const addHandler = (sel_id) => {
        if(sel_id == 0){
            if (newText) {
                let rows = newText.split('\n');
                let idx = Object.keys(data_l).length > 0 ? Object.keys(data_l).reduce((a, b)=>Math.max(parseInt(a),parseInt(b))) + 1 : 0;
    
                for (let i = 0; i < rows.length; i++) {
                    const element = rows[i];
                    let j = idx + i;
                    data_l[j] = element;
                    unmapped_l_keys.push(j);
                }
                data_l = data_l;
                unmapped_l_keys = unmapped_l_keys;
                newText = '';
            }
        }
        else if (sel_id == 1) {
            if (newText) {
                let rows = newText.split('\n');
                let idx = Object.keys(data_r).length > 0 ? Object.keys(data_r).reduce((a, b)=>Math.max(parseInt(a),parseInt(b))) + 1 : 0;

                for (let i = 0; i < rows.length; i++) {
                    const element = rows[i];
                    let j = idx + i;
                    data_r[j] = element;
                    unmapped_r_keys.push(j);
                }
                data_r = data_r;
                unmapped_r_keys = unmapped_r_keys;
                newText = '';
            }
        } else {
            
        }
    };

    const popHandler = (selected_r) => {
        console.log(selected_r);
        if (selected_l > -1) {
            unmapped_l_keys=unmapped_l_keys.filter((x)=>x!=selected_l);
            unmapped_r_keys=unmapped_r_keys.filter((x)=>x!=selected_r);
            mapped_l_keys = [...mapped_l_keys, selected_l];
            mapped_r_keys = [...mapped_r_keys, selected_r];
            selected_l = -1;
        }
    }

    const exportHandler = () => {
        exportText = '';
        for (let i=0; i<mapped_l_keys.length; i++){
            let l = data_l[mapped_l_keys[i]];
            let r = data_r[mapped_r_keys[i]];
            exportText += l + ', ' + r + '\n';
        }
        for (let i=0; i<unmapped_l_keys.length; i++){
            let l = data_l[unmapped_l_keys[i]];
            exportText += l + ',\n';
        }
    }

    const sort_r = (idx) => {
        console.log(idx);
        unmapped_r_keys.sort((a, b)=> bigSort(data_r[a], data_r[b], data_l[idx]));
        // data_r.sort((a, b) => bigSort(a.text, b.text, data_l.filter((x)=>x.id==idx)[0].text));
        // (a, b) => bigSort(a, b, data_l[idx].text)
        unmapped_r_keys = unmapped_r_keys;
    }
</script>

<!-- <input bind:value={newText} on:change={addHandler}> -->
<div class="row">
    <div>
        <button on:click={()=>addHandler(0)}> + Spec </button>
        <textarea bind:value={newText}></textarea>
        <button on:click={()=>addHandler(1)}> + Dict </button>
    </div>
    <div>
        <button on:click={exportHandler}> Export </button>
        <textarea value={exportText}></textarea>
    </div>
</div>

<div class="row">
    <div class="col m1">
        <div class="row">
            Mapped
        </div>
        <div class="row">
            <div class="col">
                {#each mapped_l_keys as item}
                <div class="box jr">
                    <button>
                        {data_l[item]}
                    </button>
                </div>
                {/each}
            </div>
            
            <div class="col">
                {#each mapped_r_keys as item}
                <div class="box jl">
                    <button>
                        {data_r[item]}
                    </button>
                </div>
                {/each}
            </div>
        </div>
    </div>
    <div class="col m1">
        <div class="row">
            Unmapped
        </div>
        <div class="row">
            <div class="col">
                {#each unmapped_l_keys as i}
                <div class="box jr">
                    <button on:click={()=>{
                        selected_l = i;
                        sort_r(i)
                    }}>
                        {data_l[i]}
                    </button>
                </div>
                {/each}
            </div>
            
            <div class="col">
                {#each unmapped_r_keys as i}
                <div class="box jl">
                    <button on:click={()=>{
                        popHandler(i);
                    }}>
                        {data_r[i]}
                    </button>
                </div>
                {/each}
            </div>
        </div>
    </div>
</div>


<style>
    .row {
        display: flex; 
        flex-direction: row;
        justify-content: center;
    }
    .col {
        display: flex;
        flex-direction: column;
    }
    .box {
        display: flex;
    }
    .jl {
        justify-content: flex-start;
    }
    .jr {
        justify-content: flex-end;
    }
    .m1 {
        margin: 1em;
    }
</style>