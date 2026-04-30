# Example 1:
In this graph, node B and node C are connected to the same end node. Node B will be aligned at the same level of node C, which is not I want
```
start ->  condition-subflow-A -> end
condition-subflow-A:
(entry) -> condition -> node A -> node C -> (exit)
          -> node B -> (exit)

overall:
start -> condition -> node A -> node C -> end
                   -----------> node B ->
```

# Example 2:
In this graph, node B and node C are connected to two separate end node. Node B will be aligned at the same level of node A
```
start -> condition -> node A -> node C -> end
                   -> node B -> end
```


